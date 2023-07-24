import { Chess as ChessJs, SQUARES, Square, PieceSymbol, Piece as ChessJsPiece, Move as ChessJsMove } from 'chess.js';

import { Move } from './History';
import { Pgn } from './Pgn';
import { TAGS } from './Header';

// Re-exported types from chess.js
export { SQUARES, Square, PieceSymbol };

export const PIECES = {
    p: { name: 'pawn', value: 1 },
    n: { name: 'knight', value: 3 },
    b: { name: 'bishop', value: 3 },
    r: { name: 'rook', value: 5 },
    q: { name: 'queen', value: 9 },
    k: { name: 'king', value: Infinity },
};

export enum COLOR {
    white = 'w',
    black = 'b',
}

export enum CommentType {
    Before = 'BEFORE',
    After = 'AFTER',
}

export const FEN = {
    empty: '8/8/8/8/8/8/8/8 w - - 0 1',
    start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
};

export enum EventType {
    Initialized = 'INITIALIZED',
    IllegalMove = 'ILLEGAL_MOVE',
    LegalMove = 'LEGAL_MOVE',
    NewVariation = 'NEW_VARIATION',
    DeleteMove = 'DELETE_MOVE',
    UpdateComment = 'UPDATE_COMMENT',
    UpdateCommand = 'UPDATE_COMMAND',
    UpdateNags = 'UPDATE_NAGS',
    UpdateDrawables = 'UPDATE_DRAWABLES',
    PromoteVariation = 'PROMOTE_VARIATION',
}

export interface Event {
    type: EventType;
    fen?: string;
    pgn?: string;
    move?: Move | null;
    previousMove?: Move | null;
    mainlineMove?: Move | null;
    variantRoot?: Move | null;
    variantParent?: Move | null;
    notation?: string | { to: string; from: string; promotion?: string };
    commentType?: CommentType;
    commentText?: string;
    commandName?: string;
    commandValue?: string;
}

export interface Observer {
    types: EventType[];
    handler: (event: Event) => void;
}

function publishEvent(observers: Observer[], event: Event) {
    for (const observer of observers) {
        if (observer.types.includes(event.type)) {
            observer.handler(event);
        }
    }
}

export type CandidateMove = string | { from: string; to: string; promotion?: string };

export interface MovesOptions {
    square?: Square;
    piece?: PieceSymbol;
    verbose?: boolean;
}

export type Piece = ChessJsPiece & {
    square: Square;
};

export interface ChessProps {
    fen?: string;
    pgn?: string;
}

/**
 * Like chess.js, but handles variations. Uses chess.js for validation and @jackstenglein/pgn-parser for the history and PGN header
 */
export class Chess {
    pgn: Pgn;
    observers: Observer[];
    _currentMove: Move | null;
    chessjs: ChessJs;

    constructor(props: ChessProps | string = FEN.start) {
        this.observers = [];
        this.pgn = new Pgn();
        this._currentMove = null;
        this.chessjs = new ChessJs();

        if (typeof props === 'string') {
            this.load(props);
        } else {
            if (props.fen) {
                this.load(props.fen);
            } else if (props.pgn) {
                this.loadPgn(props.pgn);
            } else {
                this.load(FEN.start);
            }
        }
    }

    /**
     * Sets currentMove to the provided move and returns the new current Move.
     * @param move The move to set the currentMove to. If non-null, it must exist in the pgn history.
     * @returns The new current Move.
     */
    seek(move: Move | null): Move | null {
        if (move) {
            this.chessjs.load(move.fen);
        } else {
            this.chessjs.load(this.setUpFen());
        }

        publishEvent(this.observers, {
            type: EventType.LegalMove,
            fen: this.fen(),
            move: move,
            previousMove: this._currentMove,
            notation: move?.san,
        });

        this._currentMove = move;
        return move;
    }

    /**
     * Gets the current Move.
     * @returns The current Move or null if none have been made.
     */
    currentMove(): Move | null {
        return this._currentMove;
    }

    /**
     * Returns the next mainline Move from the provided Move.
     * @param move The move to get the next move from. Defaults to the current move.
     */
    nextMove(move = this._currentMove): Move | null {
        if (!move) {
            if (this.pgn.history.moves.length === 0) {
                return null;
            }
            return this.pgn.history.moves[0];
        }
        return move.next;
    }

    /**
     * Returns the previous Move from the provided move.
     * @param move The move to get the previous Move from. Defaults to the current move.
     */
    previousMove(move = this._currentMove): Move | null {
        if (!move) {
            return null;
        }
        return move.previous;
    }

    /**
     * Returns whether the provided candidate move matches the provided Move.
     * @param candidate The candidate move to check.
     * @param move The Move to check.
     * @returns True if the candidate move is the same as the Move.
     */
    candidateMatches(candidate: CandidateMove, move: Move | null): boolean {
        if (!move) {
            return false;
        }
        if (typeof candidate === 'string') {
            return move.san === candidate;
        }
        return move.from === candidate.from && move.to === candidate.to && move.promotion === candidate.promotion;
    }

    /**
     * Returns whether the provided candidate move is the mainline continuation from the provided Move.
     * @param candidate The candidate move to check.
     * @param move The Move to check from. Defaults to the current Move.
     * @returns True if the provided candidate move is the mainline continuation from `move`.
     */
    isMainline(candidate: CandidateMove, move = this._currentMove): boolean {
        const nextMove = this.nextMove(move);
        return this.candidateMatches(candidate, nextMove);
    }

    /**
     * Returns whether the provided candidate move is an existing variation continuation from the provided Move.
     * @param candidate The candidate move to check.
     * @param move The Move to check from. Defaults to the current Move.
     * @returns True if the provided candidate move exists in the Move's variations.
     */
    isVariation(candidate: CandidateMove, move = this._currentMove): boolean {
        return this.getVariation(candidate, move) !== null;
    }

    /**
     * Returns the provided candidate move only if it is an existing variation continuation of the provided Move.
     * @param candidate The candidate move to fetch.
     * @param move The Move to check from. Defaults to the current Move.
     * @returns The provided candidate move only if it already exists in the Move's variations.
     */
    getVariation(candidate: CandidateMove, move = this._currentMove): Move | null {
        const nextMove = this.nextMove(move);
        if (!nextMove) {
            return null;
        }
        for (const variant of nextMove.variations) {
            if (variant.length === 0) {
                continue;
            }
            const m = variant[0];
            if (this.candidateMatches(candidate, m)) {
                return m;
            }
        }
        return null;
    }

    /**
     * Returns the FEN of the given move. If no move is provided, then the current move is used. If there is no current move (IE: no moves have been made), the then setup FEN is returned.
     * @param move The move to return the FEN for.
     */
    fen(move = this._currentMove): string {
        if (move) {
            return move.fen;
        } else {
            return this.setUpFen();
        }
    }

    /**
     * @returns The SetUp FEN from the PGN header or the default start FEN if there is no SetUp FEN.
     */
    setUpFen(): string {
        if (this.pgn.header.tags[TAGS.SetUp]) {
            return this.pgn.header.tags[TAGS.FEN];
        } else {
            return FEN.start;
        }
    }

    /**
     * @returns The header tags of the PGN.
     */
    header(): Record<string, string> {
        return this.pgn.header.tags;
    }

    /**
     * @param move optional
     * @returns {boolean} true, if the game is over at that move
     */
    isGameOver(move = this._currentMove): boolean {
        if (move) {
            return move.gameOver;
        } else {
            return this.chessjs.isGameOver();
        }
    }

    /**
     * @param move optional
     * @returns {boolean} true, if the game is a draw at that move
     */
    isDraw(move = this._currentMove): boolean {
        if (move) {
            return move.isDraw === true;
        } else {
            return this.chessjs.isDraw();
        }
    }

    /**
     * @param move optional
     * @returns {boolean} true, if the game is in statemate at that move
     */
    isStalemate(move = this._currentMove): boolean {
        if (move) {
            return move.isStalemate === true;
        } else {
            return this.chessjs.isStalemate();
        }
    }

    /**
     * @param move optional
     * @returns {boolean} true, if the game is in draw, because of unsufficiant material at that move
     */
    isInsufficientMaterial(move = this._currentMove): boolean {
        if (move) {
            return move.isInsufficientMaterial === true;
        } else {
            return this.chessjs.isInsufficientMaterial();
        }
    }

    /**
     * @param move optional
     * @returns {boolean} true, if the game is in draw, because of threefold repetition at that move
     */
    isThreefoldRepetition(move = this._currentMove): boolean {
        return move !== null && move.isThreefoldRepetition === true;
    }

    /**
     * @param move optional
     * @returns {boolean} true, if the game is in checkmate at that move
     */
    isCheckmate(move = this._currentMove): boolean {
        if (move) {
            return move.isCheckmate === true;
        } else {
            return this.chessjs.isCheckmate();
        }
    }

    /**
     * @param move optional
     * @returns {boolean} true, if the game is in check at that move
     */
    isCheck(move = this._currentMove): boolean {
        if (move) {
            return move.inCheck === true;
        } else {
            return this.chessjs.isCheck();
        }
    }

    /**
     * Checks whether the provided move is in the mainline.
     * @param move The move to check. Defaults to the current move.
     * @returns {boolean} True if the move is in the mainline.
     */
    isInMainline(move = this._currentMove): boolean {
        if (!move) {
            return false;
        }
        return move.variation === this.pgn.history.moves;
    }

    /**
     * Checks whether the provided move has a NAG in the provided range.
     * @param minNag The minimum NAG to check for. Inclusive.
     * @param maxNag The maximum NAG to check for. Exclusive.
     * @param move The move to check. Defaults to the current move.
     * @returns True if the move has a NAG in the provided range.
     */
    hasNagInRange(minNag: number, maxNag: number, move = this._currentMove): boolean {
        for (const nag of move?.nags || []) {
            const nagInt = parseInt(nag.slice(1));
            if (nagInt >= minNag && nagInt < maxNag) {
                return true;
            }
        }
        return false;
    }

    /**
     * @jackstenglein/chess.ts uses @jackstenglein/pgn-parser for the history and header. See https://github.com/jackstenglein/pgn-parser
     * @returns {[]} the moves of the game history
     */
    history(): Move[] {
        return this.pgn.history.moves;
    }

    /**
     * @returns The first move of the main variation or `null` if no move was made.
     */
    firstMove(): Move | null {
        if (this.pgn.history.moves.length > 0) {
            return this.pgn.history.moves[0];
        }
        return null;
    }

    /**
     * The piece on the provided square.
     * @param square The square to get the piece for.
     * @param move The move after which to get the piece. Defaults to the current move.
     * @returns The piece on the provided square or null if no piece is there.
     */
    get(square: Square, move = this._currentMove): Piece | null {
        if (move) {
            this.chessjs.load(move.fen);
        } else {
            this.chessjs.load(this.setUpFen());
        }

        const chessJsPiece = this.chessjs.get(square);
        if (!chessJsPiece) {
            return null;
        }
        return { ...chessJsPiece, square };
    }

    /**
     * @returns The last move of the main variation or `null` if no move was made.
     */
    lastMove(): Move | null {
        if (this.pgn.history.moves.length > 0) {
            return this.pgn.history.moves[this.pgn.history.moves.length - 1];
        }
        return null;
    }

    /**
     * Load a FEN
     * @param {string} fen The FEN to load
     */
    load(fen: string) {
        this.chessjs.load(fen);
        this.pgn = new Pgn();
        this._currentMove = null;

        if (fen !== FEN.start) {
            this.pgn.header.tags[TAGS.SetUp] = '1';
            this.pgn.header.tags[TAGS.FEN] = this.chessjs.fen();
            this.pgn.history.setUpFen = fen;
            publishEvent(this.observers, { type: EventType.Initialized, fen: fen });
        }
    }

    /**
     * Load a PGN with variations, NAGs, header and annotations. @jackstenglein/chess.ts uses
     * @jackstenglein/pgn-parser for the header and history. See https://github.com/jackstenglein/pgn-parser
     * @param pgn
     */
    loadPgn(pgn: string) {
        this.pgn = new Pgn(pgn);
        this._currentMove = this.lastMove();
        this.chessjs.load(this.fen());
        publishEvent(this.observers, { type: EventType.Initialized, pgn: pgn });
    }

    /**
     * Make a move in the game and update the currentMove. If the move already exists in the PGN history,
     * it is returned unchanged.
     * @param move The move to make.
     * @param previousMove The move to play from. If not included, the currentMove is used.
     * @param sloppy to allow sloppy SAN
     * @returns {Move|null} The created or existing Move, if successful.
     */
    move(candidate: CandidateMove, previousMove: Move | null = this._currentMove, sloppy = true): Move | null {
        const nextMove = this.nextMove(previousMove);
        if (this.candidateMatches(candidate, nextMove)) {
            publishEvent(this.observers, {
                type: EventType.LegalMove,
                move: nextMove!,
                previousMove: previousMove,
            });
            return this.seek(nextMove);
        }

        const existingVariant = this.getVariation(candidate, previousMove);
        if (existingVariant) {
            publishEvent(this.observers, {
                type: EventType.LegalMove,
                move: existingVariant,
                previousMove: previousMove,
            });
            return this.seek(existingVariant);
        }

        // The move doesn't already exist as the mainline or a continuation, so we add it to the PGN.
        try {
            const moveResult = this.pgn.history.addMove(candidate, previousMove, sloppy);
            publishEvent(this.observers, {
                type: EventType.NewVariation,
                move: moveResult,
                previousMove: previousMove,
            });
            return this.seek(moveResult);
        } catch (e) {
            publishEvent(this.observers, {
                type: EventType.IllegalMove,
                notation: candidate,
                previousMove,
            });
            return null;
        }
    }

    /**
     * Return all valid moves
     * @param options {{ square: "e2", piece: "n", verbose: true }}
     * Fields with { verbose: true }
     * - `color` indicates the color of the moving piece (w or b).
     * - `from` and `to` fields are from and to squares in algebraic notation.
     * - `piece`, `captured`, and `promotion` fields contain the lowercase representation of the applicable piece (pnbrqk). The captured and promotion fields are only present when the move is a valid capture or promotion.
     * - `san` is the move in Standard Algebraic Notation (SAN).
     * - `flags` field contains one or more of the string values:
     *      n - a non-capture
     *      b - a pawn push of two squares
     *      e - an en passant capture
     *      c - a standard capture
     *      p - a promotion
     *      k - kingside castling
     *      q - queenside castling
     *   A flags value of pc would mean that a pawn captured a piece on the 8th rank and promoted.
     * @param move
     * @returns {ChessJsMove[]}
     */
    moves(options: MovesOptions = {}, move = this._currentMove): ChessJsMove[] {
        this.chessjs.load(this.fen(move));
        return this.chessjs.moves({ ...options, verbose: true });
    }

    /**
     * Don't make a move, just validate, if it would be a correct move
     * @param move
     * @param previousMove optional, the previous move (for variations)
     * @param sloppy to allow sloppy SAN
     * @returns the move object or null if not valid
     */
    validateMove(notation: CandidateMove, previousMove = this._currentMove, sloppy = true): Move | null {
        return this.pgn.history.validateMove(notation, previousMove, sloppy);
    }

    /**
     * Render the game as PGN with header, comments and NAGs
     * @param renderHeader optional, default true
     * @param renderComments optional, default true
     * @param renderNags optional, default true
     * @returns {string} the PGN of the game.
     */
    renderPgn(width = -1, renderHeader = true, renderComments = true, renderNags = true): string {
        return this.pgn.render(width, renderHeader, renderComments, renderNags);
    }

    /**
     * Get the position of the specified figures at a specific move
     * @param type "p", "n", "b",...
     * @param color "b" or "w"
     * @param move
     * @returns {Piece[]} the pieces (positions) at a specific move
     */
    pieces(
        type: PieceSymbol | undefined = undefined,
        color: COLOR | undefined = undefined,
        move = this.lastMove()
    ): Piece[] {
        this.chessjs.load(this.fen(move));
        let result: Piece[] = [];
        for (let i = 0; i < 64; i++) {
            const square = SQUARES[i];
            const chessJsPiece = this.chessjs.get(square);
            if (!chessJsPiece) {
                continue;
            }

            const piece = {
                ...chessJsPiece,
                square,
            };

            if ((!type || type === piece.type) && (!color || color === piece.color)) {
                result.push(piece);
            }
        }
        return result;
    }

    /**
     * get the piece on a square
     * @param square
     * @param move
     * @returns {{color: any, type: any}|null}
     */
    piece(square: Square, move = this._currentMove): { color: any; type: any } | null {
        this.chessjs.load(this.fen(move));
        return this.chessjs.get(square);
    }

    /**
     * Returns whose turn it is after the provided move.
     * @param move The move to check the turn of. Defaults to the current move.
     * @returns Whose turn it is after the provided move.
     */
    turn(move = this._currentMove): COLOR {
        if (!move) {
            const fenParts = this.setUpFen().split(' ');
            return fenParts[1] as COLOR;
        }
        if (move.color === COLOR.black) {
            return COLOR.white;
        }
        return COLOR.black;
    }

    /**
     * Checks whether a move is a descendant of another move.
     * @param parent The potential parent to check.
     * @param move The move to check. Defaults to the current move.
     */
    isDescendant(parent: Move, move = this._currentMove): boolean {
        if (!move) {
            return false;
        }
        if (parent === move) {
            return true;
        }
        if (move.ply < parent.ply) {
            return false;
        }
        if (this.isInMainline(parent)) {
            return true;
        }
        if (this.isInMainline(move)) {
            return false;
        }

        const parentRoot = parent.variation;
        let moveRoot: Move[] | undefined = move.variation;
        do {
            if (moveRoot === parentRoot) {
                return true;
            }
            moveRoot = moveRoot[0].previous?.variation;
        } while (moveRoot && !this.isInMainline(moveRoot[0]));

        return false;
    }

    /**
     * Delete a move and all moves after it
     * @param move The move to delete from. Defaults to the current move.
     */
    delete(move = this._currentMove) {
        if (!move) {
            return;
        }
        if (move.previous?.next === move) {
            move.previous.next = null;
        }

        const index = move.variation.findIndex((element) => {
            return element.ply === move.ply;
        });
        move.variation.splice(index);

        if (index === 0 && move.previous?.next) {
            move.previous.next.variations = move.previous.next.variations.filter((v) => v.length > 0);
        }

        if (this.isDescendant(move)) {
            this.seek(move.previous);
        }

        publishEvent(this.observers, {
            type: EventType.DeleteMove,
            move: move,
            previousMove: move.previous,
            mainlineMove: move.previous?.next,
        });
    }

    plyCount() {
        return this.history().length;
    }

    fenOfPly(plyNumber: number) {
        if (plyNumber > 0) {
            return this.history()[plyNumber - 1].fen;
        } else {
            return this.setUpFen();
        }
    }

    addObserver(observer: Observer) {
        this.observers.push(observer);
    }

    removeObserver(observer: Observer) {
        this.observers = this.observers.filter((o) => o !== observer);
    }

    getComment(type: CommentType = CommentType.After, move = this._currentMove): string {
        if (!move) {
            return this.pgn.gameComment;
        }
        if (type === CommentType.Before) {
            return move.commentMove || '';
        }
        return move.commentAfter || '';
    }

    setComment(text: string, type: CommentType = CommentType.After, move = this._currentMove) {
        if (move === null) {
            this.pgn.gameComment = text;
        } else if (type === CommentType.Before) {
            move.commentMove = text;
        } else if (type === CommentType.After) {
            move.commentAfter = text;
        }

        publishEvent(this.observers, { type: EventType.UpdateComment, move, commentType: type, commentText: text });
    }

    setCommand(name: string, value: string, move = this._currentMove) {
        if (move !== null) {
            move.commentDiag = {
                ...move.commentDiag,
                [name]: value,
            };

            publishEvent(this.observers, {
                type: EventType.UpdateCommand,
                move,
                commandName: name,
                commandValue: value,
            });
        }
    }

    setNags(nags?: string[], move = this._currentMove) {
        if (move !== null) {
            move.nags = nags;
            publishEvent(this.observers, {
                type: EventType.UpdateNags,
                move,
            });
        }
    }

    setDrawables(arrows: string[] | undefined, squares: string[] | undefined, move = this._currentMove) {
        if (move !== null) {
            move.commentDiag = {
                ...move.commentDiag,
                colorArrows: arrows,
                colorFields: squares,
            };

            publishEvent(this.observers, {
                type: EventType.UpdateDrawables,
                move,
            });
        }
    }

    canPromoteVariation(move = this._currentMove, intoMainline = false): boolean {
        if (!move) {
            return false;
        }
        if (this.isInMainline(move)) {
            return false;
        }

        if (!move.variation[0].previous) {
            return false;
        }
        if (intoMainline) {
            return true;
        }

        const variantRoot = move.variation[0];
        const variantParent = variantRoot.previous?.next;
        if (!variantParent) {
            return false;
        }

        const variantIndex = variantParent.variations.findIndex((v) => v[0] === variantRoot);
        return variantIndex >= 1;
    }

    promoteVariation(move = this._currentMove, intoMainline = false) {
        if (!move || !this.canPromoteVariation(move, intoMainline)) {
            return;
        }

        if (intoMainline) {
            let moveRoot: Move | undefined = move.variation[0];
            do {
                if (this.isInMainline(moveRoot.previous)) {
                    break;
                }
                moveRoot = moveRoot.previous?.variation[0];
            } while (moveRoot);

            if (!moveRoot) {
                return;
            }
            move = moveRoot;
        }

        const variantRoot = move.variation[0];
        const variantParent = variantRoot.previous?.next;
        if (!variantParent) {
            return;
        }

        const variantIndex = variantParent.variations.findIndex((v) => v[0] === variantRoot);
        if (variantIndex < 0) {
            return;
        }
        if (intoMainline || variantIndex === 0) {
            // Fix variation and next for previous moves
            const parentVariation = variantParent.variation;
            const parentIndex = parentVariation.findIndex((m) => m === variantParent);
            variantParent.variation = parentVariation.splice(parentIndex);
            parentVariation.push(...move.variation);
            variantRoot.previous!.next = variantRoot;

            // Fix variations field for both variations
            variantRoot.variations = [
                variantParent.variation,
                ...variantParent.variations.slice(0, variantIndex),
                ...variantParent.variations.slice(variantIndex + 1),
            ];
            variantParent.variations = [];

            // Fix variation field for both variations
            for (let i = variantRoot.variation.length - 1; i >= 0; i--) {
                variantRoot.variation[i].variation = variantRoot.previous!.variation;
            }
            for (const m of variantParent.variation) {
                m.variation = variantParent.variation;
            }
        } else {
            const temp = variantParent.variations[variantIndex - 1];
            variantParent.variations[variantIndex - 1] = variantParent.variations[variantIndex];
            variantParent.variations[variantIndex] = temp;
        }

        publishEvent(this.observers, {
            type: EventType.PromoteVariation,
            move,
            variantRoot,
            variantParent,
        });
    }
}
