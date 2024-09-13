import { Chess as ChessJs, SQUARES, Square, PieceSymbol, Piece as ChessJsPiece, Move as ChessJsMove } from 'chess.js';
import { Move, getNullMove } from './History';
import { Pgn, RenderOptions } from './Pgn';
import { DiagramComment } from '@jackstenglein/pgn-parser';
import { Header } from './Header';

export { SQUARES, Square, PieceSymbol };

export const PIECES = {
    p: { name: 'pawn', value: 1 },
    n: { name: 'knight', value: 3 },
    b: { name: 'bishop', value: 3 },
    r: { name: 'rook', value: 5 },
    q: { name: 'queen', value: 9 },
    k: { name: 'king', value: Infinity },
};

export enum Color {
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
} as const;

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
    UpdateHeader = 'UPDATE_HEADER',
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
    headerName?: string;
    headerValue?: string;
}

/** An observer that subscribes to events from the Chess instance. */
export interface Observer {
    /** The types of events the observer is notified for. */
    types: EventType[];

    /** The callback function that is notified of events. */
    handler: (event: Event) => void;
}

/**
 * Calls the handler function for all observers that should be notified for the provided
 * event.
 * @param observers The list of observers to potentially notify.
 * @param event The event to send to the observers.
 */
function publishEvent(observers: Observer[], event: Event) {
    for (const observer of observers) {
        if (observer.types.includes(event.type)) {
            observer.handler(event);
        }
    }
}

/** A potential move to validate or play. */
export type CandidateMove = string | { from: Square; to: Square; promotion?: string };

export interface MovesOptions {
    /** The square to get moves for. */
    square?: Square;

    /** The piece to get moves for. */
    piece?: PieceSymbol;

    /** Whether to disable null moves. Overrides the Chess instance prop. */
    disableNullMoves?: boolean;
}

/** A piece on a specific square. */
export type Piece = ChessJsPiece & {
    square: Square;
};

export interface ChessProps {
    /** The PGN to initialize with. Takes precedence over fen if both are provided. */
    pgn?: string;

    /** The FEN to initialize with. */
    fen?: string;

    /** Whether to disable null moves. */
    disableNullMoves?: boolean;
}

/**
 * Returns the normalized version of the provided FEN. FENs are normalized in the following way:
 * 1. The en passant target square is set to -, unless en passant is currently a legal move.
 * 2. The halfmove clock field is set to 0.
 * 3. The fullmove clock field is set to 1.
 *
 * @param fen The FEN to normalize.
 * @returns The normalized FEN.
 */
export function normalizeFen(fen: string): string {
    const tokens = fen.split(' ');
    if (tokens.length < 4) {
        throw new Error(`Invalid FEN: '${fen}'. FEN does not have at least 4 tokens.`);
    }

    const pieces = tokens[0];
    const color = tokens[1];
    const castling = tokens[2];
    const enPassant = tokens[3];

    return `${pieces} ${color} ${castling} ${enPassant} 0 1`;
}

/**
 * Like chess.js, but handles variations. Uses chess.js for validation and
 * @jackstenglein/pgn-parser for the history and PGN header.
 */
export class Chess {
    pgn: Pgn;
    observers: Observer[];
    _currentMove: Move | null;
    chessjs: ChessJs;
    disableNullMoves: boolean;

    /**
     * Constructs a new Chess instance from the given PGN or FEN.
     * If both PGN and FEN are provided, PGN takes priority and FEN is ignored.
     * @param props The props to construct the Chess instance with.
     */
    constructor({ fen, pgn, disableNullMoves = false }: ChessProps = {}) {
        this.observers = [];
        this.pgn = new Pgn({});
        this._currentMove = null;
        this.chessjs = new ChessJs();
        this.disableNullMoves = disableNullMoves;

        if (pgn) {
            this.loadPgn(pgn);
        } else if (fen) {
            this.load(fen);
        } else {
            this.load(FEN.start);
        }
    }

    /**
     * Subscribes the given observer to events.
     * @param observer The observer to add.
     */
    addObserver(observer: Observer) {
        this.observers.push(observer);
    }

    /**
     * Unsubscribes the given observer from events.
     * @param observer The observer to remove.
     */
    removeObserver(observer: Observer) {
        this.observers = this.observers.filter((o) => o !== observer);
    }

    /**
     * Loads a FEN. The current move, history and tags will be cleared.
     * @param fen The FEN to load.
     */
    load(fen: string) {
        this.chessjs.load(fen);
        this.pgn = new Pgn({ fen });
        this._currentMove = null;
        publishEvent(this.observers, { type: EventType.Initialized, fen });
    }

    /**
     * Loads a PGN. The current move is set to the last move of the PGN.
     * @param pgn The PGN to load.
     */
    loadPgn(pgn: string) {
        this.pgn = new Pgn({ pgn });
        this._currentMove = this.lastMove();
        this.chessjs.load(this.fen());
        publishEvent(this.observers, { type: EventType.Initialized, pgn });
    }

    /**
     * @returns The header of the PGN.
     */
    header(): Header {
        return this.pgn.header;
    }

    /**
     * @returns The SetUp FEN from the PGN header or the default start FEN if there is no SetUp FEN.
     */
    setUpFen(): string {
        if (this.pgn.header.tags.SetUp) {
            return this.pgn.header.tags.FEN || FEN.start;
        } else {
            return FEN.start;
        }
    }

    /**
     * Returns the FEN of the given move. If no move is provided, then the current move is used. If there is no current move (IE: no moves have been made), then the setup FEN is returned.
     * @param move The move to return the FEN for. Defaults to the current move.
     */
    fen(move = this._currentMove): string {
        if (move) {
            return move.fen;
        } else {
            return this.setUpFen();
        }
    }

    /**
     * Returns the normalized FEN of the given move. If no move is provided, then the current move is used.
     * If there is no current move, then the setup FEN is normalized and returned. FENs are normalized in
     * the following way:
     * 1. The en passant target square is set to -, unless en passant is currently a legal move.
     * 2. The halfmove clock field is set to 0.
     * 3. The fullmove clock field is set to 1.
     *
     * @param move The move to return the normalized FEN for. Defaults to the current move.
     */
    normalizedFen(move = this._currentMove): string {
        if (move) {
            return normalizeFen(move.fen);
        }
        return normalizeFen(this.setUpFen());
    }

    /**
     * Returns the FEN of the mainline move with the given ply.
     * If the ply number is invalid (<= 0), the setup ply is returned.
     * @param plyNumber The ply to get the FEN of.
     * @returns The FEN of the mainline move with the given ply.
     */
    fenOfPly(plyNumber: number) {
        if (plyNumber > 0) {
            return this.history()[plyNumber - 1].fen;
        } else {
            return this.setUpFen();
        }
    }

    /**
     * @returns A list of the mainline moves in the game history.
     */
    history(): Move[] {
        return this.pgn.history.moves;
    }

    /**
     * @returns The number of plies in the mainline.
     */
    plyCount() {
        return this.history().length;
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
     * @returns The last move of the main variation or `null` if no move was made.
     */
    lastMove(): Move | null {
        if (this.pgn.history.moves.length > 0) {
            return this.pgn.history.moves[this.pgn.history.moves.length - 1];
        }
        return null;
    }

    /**
     * Gets the current Move.
     * @returns The current Move or null if at the starting position.
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
     * Sets currentMove to the provided move and returns the new current Move. Also emits
     * a LegalMove event.
     * @param move The move to set the currentMove to or null to go to the starting position.
     * If non-null, it must exist in the pgn history.
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
     * Checks whether the provided move is in the mainline.
     * @param move The move to check. Defaults to the current move.
     * @returns True if the move is in the mainline or null (the starting position is in the mainline).
     */
    isInMainline(move = this._currentMove): boolean {
        if (!move) {
            return true;
        }
        return move.variation === this.pgn.history.moves;
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
     * Make a move in the game and update the currentMove. If the move already exists in the PGN history,
     * it is returned unchanged. Emits a LegalMove, NewVariation, IllegalMove or no event depending on the
     * result of the function call.
     * @param candidate The move to make.
     * @param previousMove The move to play from. Defaults to the current move.
     * @param strict Whether to use the strict SAN parser. Defaults to false.
     * @param existingOnly Return null if the Move doesn't already exist. Defaults to false.
     * @param skipSeek If true, return the move but do not update the current move and do not publish an event. Defaults to false.
     * @param disableNullMoves Whether to disable null moves. Defaults to the Chess instance's prop.
     * @returns The created or existing Move, if successful. Null if not successful.
     */
    move(
        candidate: CandidateMove,
        {
            previousMove = this._currentMove,
            strict,
            existingOnly,
            skipSeek,
            disableNullMoves = this.disableNullMoves,
        }: {
            previousMove?: Move | null;
            strict?: boolean;
            existingOnly?: boolean;
            skipSeek?: boolean;
            disableNullMoves?: boolean;
        } = {}
    ): Move | null {
        const nextMove = this.nextMove(previousMove);
        if (this.candidateMatches(candidate, nextMove)) {
            if (skipSeek) {
                return nextMove;
            }
            publishEvent(this.observers, {
                type: EventType.LegalMove,
                move: nextMove!,
                previousMove: previousMove,
            });
            return this.seek(nextMove);
        }

        const existingVariant = this.getVariation(candidate, previousMove);
        if (existingVariant) {
            if (skipSeek) {
                return existingVariant;
            }
            publishEvent(this.observers, {
                type: EventType.LegalMove,
                move: existingVariant,
                previousMove: previousMove,
            });
            return this.seek(existingVariant);
        }

        if (existingOnly) {
            return null;
        }

        // The move doesn't already exist as the mainline or a continuation, so we add it to the PGN.
        try {
            const moveResult = this.pgn.history.addMove(candidate, {
                previous: previousMove,
                disableNullMoves,
                strict,
            });
            if (skipSeek) {
                return moveResult;
            }
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
     * Validates if a move would be legal, but doesn't add it to the history, update the current move
     * or create events.
     * @param candidate The move to validate.
     * @param previousMove The move to play from. Defaults to the current move.
     * @param disableNullMoves Whether to disable null moves. Defaults to the Chess instance's prop.
     * @param strict Whether to use the strict SAN parser. Defaults to false.
     * @returns The move object or null if not valid.
     */
    validateMove(
        candidate: CandidateMove,
        {
            previousMove = this._currentMove,
            disableNullMoves = this.disableNullMoves,
            strict,
        }: {
            previousMove?: Move | null;
            disableNullMoves?: boolean;
            strict?: boolean;
        } = {}
    ): Move | null {
        return this.pgn.history.validateMove(candidate, { previous: previousMove, disableNullMoves, strict });
    }

    /**
     * Delete a move and all moves after it. If the move has variations, the top variation
     * replaces this move as the continuation. Emits a DeleteMove event.
     * @param move The move to delete from. Defaults to the current move.
     */
    delete(move = this._currentMove) {
        if (!move) {
            return;
        }

        const index = move.variation.findIndex((element) => {
            return element.ply === move.ply;
        });
        move.variation.splice(index);

        const mainlineMove = move.previous ? move.previous.next : this.firstMove();

        if (mainlineMove === move) {
            if (move.previous) {
                move.previous.next = null;

                if (move.variations.length > 0) {
                    move.previous.next = move.variations[0][0];
                    move.previous.variation.push(...move.previous.next.variation);
                    move.previous.next.variation = move.previous.variation;
                    move.previous.next.variations = move.variations.slice(1);
                }
            } else if (move.variations.length > 0) {
                this.pgn.history.moves = move.variations[0][0].variation;
                move.variations[0][0].variations = move.variations.slice(1);
            }
        } else if (index === 0 && mainlineMove) {
            mainlineMove.variations = mainlineMove.variations.filter((v) => v.length > 0);
        }

        if (this.isDescendant(move)) {
            this.seek(move.previous);
        }

        publishEvent(this.observers, {
            type: EventType.DeleteMove,
            move: move,
            previousMove: move.previous,
            mainlineMove,
        });
    }

    /**
     * Returns the variant parent of the provided move. IE: if this move is in a variation,
     * the main continuation at the start of the variation is returned. If the move is in the
     * mainline, null is returned.
     * @param move The move to get the variant parent of. Defaults to the current move.
     * @returns The variant parent of the provided move.
     */
    getVariantParent(move = this._currentMove): Move | null {
        if (!move) {
            return null;
        }
        if (this.isInMainline(move)) {
            return null;
        }

        const variantRoot = move.variation[0];
        if (!variantRoot.previous) {
            return this.firstMove();
        }
        return variantRoot.previous.next;
    }

    /**
     * Returns true if the provided move can be promoted. Conditions for promotion:
     * 1. The move must be in a variation.
     * 1. Either intoMainline is true, the move's variant parent is not in the mainline or
     * the move is not the parent's first variation.
     * @param move The move to check for promotion.
     * @param intoMainline Whether to check for promotion into the mainline.
     * @returns True if the move can be promoted.
     */
    canPromoteVariation(move = this._currentMove, intoMainline = false): boolean {
        const variantParent = this.getVariantParent(move);
        if (!variantParent) {
            return false;
        }

        if (intoMainline) {
            return true;
        }

        if (!this.isInMainline(variantParent)) {
            return true;
        }

        const variantRoot = move?.variation[0];
        const variantIndex = variantParent.variations.findIndex((v) => v[0] === variantRoot);
        return variantIndex >= 1;
    }

    /**
     * Promotes the given move, optionally into the mainline, and emits a PromoteVariation
     * event. If the move is null or cannot be promoted, this function is a no-op.
     * @param move The move to promote.
     * @param intoMainline Whether to promote the move into the mainline.
     */
    promoteVariation(move = this._currentMove, intoMainline = false) {
        if (!move || !this.canPromoteVariation(move, intoMainline)) {
            return;
        }

        let nextVariantRoot: Move | undefined = move.variation[0];
        let nextVariantParent: Move | null | undefined = this.getVariantParent(move);
        if (!nextVariantParent) {
            return;
        }

        let variantRoot: Move;
        let variantParent: Move;

        do {
            variantRoot = nextVariantRoot;
            variantParent = nextVariantParent;

            const variantIndex = variantParent.variations.findIndex((v) => v[0] === variantRoot);
            if (variantIndex < 0) {
                break;
            }
            if (intoMainline || variantIndex === 0) {
                // Fix variation and next for previous moves
                const parentVariation = variantParent.variation;
                const parentIndex = parentVariation.findIndex((m) => m === variantParent);
                variantParent.variation = parentVariation.splice(parentIndex);
                if (variantRoot.previous) {
                    variantRoot.previous.next = variantRoot;
                    parentVariation.push(...move.variation);
                } else {
                    this.pgn.history.moves = variantRoot.variation;
                }

                // Fix variations field for both variations
                variantRoot.variations = [
                    variantParent.variation,
                    ...variantParent.variations.slice(0, variantIndex),
                    ...variantParent.variations.slice(variantIndex + 1),
                ];
                variantParent.variations = [];

                // Fix variation field for both variations
                if (variantRoot.previous) {
                    for (let i = variantRoot.variation.length - 1; i >= 0; i--) {
                        variantRoot.variation[i].variation = variantRoot.previous.variation;
                    }
                }

                for (const m of variantParent.variation) {
                    m.variation = variantParent.variation;
                }
            } else {
                const temp = variantParent.variations[variantIndex - 1];
                variantParent.variations[variantIndex - 1] = variantParent.variations[variantIndex];
                variantParent.variations[variantIndex] = temp;
            }

            nextVariantRoot = variantRoot.previous?.variation[0];
            nextVariantParent = this.getVariantParent(nextVariantRoot);
        } while (intoMainline && nextVariantRoot && nextVariantParent && !this.isInMainline(nextVariantRoot));

        publishEvent(this.observers, {
            type: EventType.PromoteVariation,
            move,
            variantRoot,
            variantParent,
        });
    }

    /**
     * Returns the comment for the given move.
     * @param type The type of comment to get. Defaults to After.
     * @param move The move to get the comment for. Defaults to the current move.
     * @returns The comment for the given move.
     */
    getComment(type: CommentType = CommentType.After, move = this._currentMove): string {
        if (!move) {
            return this.pgn.gameComment.comment || '';
        }
        if (type === CommentType.Before) {
            return move.commentMove || '';
        }
        return move.commentAfter || '';
    }

    /**
     * Sets the comment for the given move and emits an UpdateComment event.
     * @param text The text of the comment.
     * @param type The type of the comment. Defaults to After.
     * @param move The move to set the comment for. Defaults to the current move.
     */
    setComment(text: string, type: CommentType = CommentType.After, move = this._currentMove) {
        if (move === null) {
            this.pgn.gameComment.comment = text;
        } else if (type === CommentType.Before) {
            move.commentMove = text;
        } else if (type === CommentType.After) {
            move.commentAfter = text;
        }
        publishEvent(this.observers, { type: EventType.UpdateComment, move, commentType: type, commentText: text });
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
     * Sets the NAGs for the provided move and emits an UpdateNags event. If move is
     * null, this is a no-op.
     * @param nags The NAGs to set.
     * @param move The move to set the NAGs for. Defaults to the current move.
     */
    setNags(nags?: string[], move = this._currentMove) {
        if (move !== null) {
            move.nags = nags;
            publishEvent(this.observers, {
                type: EventType.UpdateNags,
                move,
            });
        }
    }

    /**
     * Sets the arrows and highlights for the provided move and emits an UpdateDrawables event.
     * @param arrows The arrows to set.
     * @param squares The highlighted squares to set.
     * @param move The move to set the arrows/highlights for. Defaults to the current move.
     */
    setDrawables(arrows: string[] | undefined, squares: string[] | undefined, move = this._currentMove) {
        if (move !== null) {
            move.commentDiag = {
                ...move.commentDiag,
                colorArrows: arrows,
                colorFields: squares,
            } as DiagramComment;
        } else {
            this.pgn.gameComment = {
                ...this.pgn.gameComment,
                colorArrows: arrows,
                colorFields: squares,
            } as DiagramComment;
        }

        publishEvent(this.observers, {
            type: EventType.UpdateDrawables,
            move,
        });
    }

    /**
     * Sets the given PGN command on the given move and emits an UpdateCommand event. If
     * move is null, this is a no-op.
     * @param name The name of the PGN command.
     * @param value The value of the command.
     * @param move The move to set the command for. Defaults to the current move.
     */
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

    /**
     * Sets the given PGN header and emits an UpdateHeader event. If
     * value is undefined, the header is removed from the PGN.
     * @param name The name of the header.
     * @param value The value of the header.
     */
    setHeader(name: string, value?: string) {
        this.pgn.header.setValue(name, value);

        publishEvent(this.observers, {
            type: EventType.UpdateHeader,
            headerName: name,
            headerValue: value,
        });
    }

    /**
     * Render the game as a PGN string, using the provided options.
     * @param options An object that controls which fields are included in the output.
     * @returns The PGN of the game as a string.
     */
    renderPgn(options?: RenderOptions): string {
        return this.pgn.render(options || {});
    }

    /************************************************************
     *                                                          *
     *            Functionality provided by Chess.js            *
     *               (or very lightly modified)                 *
     *                   Alphabetical Order                     *
     *                                                          *
     ************************************************************/

    /**
     * Returns a string containing an ASCII diagram of the position after the provided move.
     * @param move The move to get an ASCII diagram of. Defaults to the current move.
     */
    ascii(move = this._currentMove): string {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.ascii();
    }

    /**
     * Returns a 2D array representation of the position after the provided move.
     * Empty squares are represented by null.
     * @param move The move to get the position of. Defaults to the current move.
     */
    board(move = this._currentMove) {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.board();
    }

    /**
     * Returns the piece on the provided square.
     * @param square The square to get the piece for.
     * @param move The move after which to get the piece. Defaults to the current move.
     * @returns The piece on the provided square or null if no piece is there.
     */
    get(square: Square, move = this._currentMove): Piece | null {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        const chessJsPiece = this.chessjs.get(square);
        if (!chessJsPiece) {
            return null;
        }
        return { ...chessJsPiece, square };
    }

    /**
     * Returns the castling rights for the given color. An object is returned which indicates
     * whether the right is available or not for both kingside and queenside. Note this does
     * not indicate whether castling is legal or not in the position, as checks, etc. need
     * to be considered also.
     * @param color The color to get castling rights for.
     * @param move The move after which to get castling rights. Defaults to the current move.
     * @returns The castling rights for the given color.
     */
    getCastlingRights(color: Color, move = this._currentMove) {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.getCastlingRights(color);
    }

    /**
     * Returns true if the square is attacked any piece of the given color.
     * @param square The square to check.
     * @param color The color to check.
     * @param move The move after which to check. Defaults to the current move.
     * @returns True if the square is attacked by color.
     */
    isAttacked(square: Square, color: Color, move = this._currentMove): boolean {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.isAttacked(square, color);
    }

    /**
     * Returns true if the side to move is in check.
     * @param move The move to check for check. Defaults to the current move.
     */
    isCheck(move = this._currentMove): boolean {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.isCheck();
    }

    /**
     * Returns true if the side to move has been checkmated.
     * @param move The move to check for checkmate. Defaults to the current move.
     */
    isCheckmate(move = this._currentMove): boolean {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.isCheckmate();
    }

    /**
     * Returns true if the game is drawn (50-move rule or insufficient material).
     * @param move The move to check for a draw. Defaults to the current move.
     */
    isDraw(move = this._currentMove): boolean {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.isDraw();
    }

    /**
     * Returns true if the game has ended via checkmate, stalemate, draw, threefold repetition,
     * or insufficient material.
     * @param move The move to check. Defaults to the current move.
     */
    isGameOver(move = this._currentMove): boolean {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.isGameOver();
    }

    /**
     * Returns true if the game is drawn due to insufficient material (K vs K, K vs KB, K vs KN).
     * @param move The move to check for insufficient material. Defaults to the current move.
     */
    isInsufficientMaterial(move = this._currentMove): boolean {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.isInsufficientMaterial();
    }

    /**
     * Returns true if the side to move has been stalemated.
     * @param move The move to check for stalemate. Defaults to the current move.
     */
    isStalemate(move = this._currentMove): boolean {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.isStalemate();
    }

    /**
     * Returns true if the current board position has occurred three or more times.
     * @param move The move to check for three-fold repetition. Defaults to the current move.
     */
    isThreefoldRepetition(move = this._currentMove): boolean {
        this.chessjs.load(this.fen(move), { skipValidation: true });
        return this.chessjs.isThreefoldRepetition();
    }

    /**
     * Returns the move number of the provided move.
     * @param move The move to get the number of. Defaults to the current move.
     */
    moveNumber(move = this._currentMove): number {
        this.chessjs.load(this.fen(move));
        return this.chessjs.moveNumber();
    }

    /**
     * Returns a list of legal moves. This function takes an optional object which can be used to restrict the move generator.
     * By default, all legal moves will be returned, plus a null move (Z0) if the side to move is not in check.
     * @param options Options to restrict the generated moves.
     * @param move The move to get the legal moves from. Defaults to the current move.
     * @returns A list of legal moves.
     */
    moves(options: MovesOptions = {}, move = this._currentMove): ChessJsMove[] {
        this.chessjs.load(this.fen(move));
        const moves = this.chessjs.moves({ ...options, verbose: true });
        const nullMove = getNullMove(this.chessjs, { disableNullMoves: this.disableNullMoves, ...options });
        if (nullMove) {
            moves.push(nullMove);
        }
        return moves;
    }

    /**
     * Returns the position of the specified pieces.
     * @param type The piece type to get. If undefined (the default), all piece types are included.
     * @param color The color to get. If undefined (the default), both colors are included.
     * @param move The move to get the pieces at. Defaults to the current move.
     * @returns The pieces at the specified move.
     */
    pieces(
        type: PieceSymbol | undefined = undefined,
        color: Color | undefined = undefined,
        move = this._currentMove
    ): Piece[] {
        this.chessjs.load(this.fen(move));
        let result: Piece[] = [];

        for (const ranks of this.chessjs.board()) {
            for (const square of ranks) {
                if (square && (!type || type === square.type) && (!color || color === square.color)) {
                    result.push(square);
                }
            }
        }

        return result;
    }

    /**
     * Returns the color of the square ('light' or 'dark').
     * @param square The square to get the color of.
     */
    squareColor(square: Square) {
        return this.chessjs.squareColor(square);
    }

    /**
     * Returns the current side to move.
     * @param move The move to check the turn of. Defaults to the current move.
     */
    turn(move = this._currentMove): Color {
        if (!move) {
            const fenParts = this.setUpFen().split(' ');
            return fenParts[1] as Color;
        }
        if (move.color === Color.black) {
            return Color.white;
        }
        return Color.black;
    }
}
