import { PgnMove, DiagramComment } from '@jackstenglein/pgn-parser';
import { Chess, Move as ChessJsMove, KING, Square } from 'chess.js';
import { CandidateMove, FEN, MovesOptions } from './Chess';

export type Move = ChessJsMove & {
    /** The next mainline move after this one, if it exists. */
    next: Move | null;

    /** The ply of the move. */
    ply: number;

    /** The previous move, if it exists. */
    previous: Move | null;

    /**
     * An array of the move's variation. If the move is not in the mainline,
     * the array starts at the first non-mainline move.
     */
    variation: Move[];

    /**
     * An array of non-mainline moves that are alternatives to this move.
     */
    variations: Move[][];

    /** The FEN after this move is played. */
    fen: string;

    /** The UCI of the move.  */
    uci: string;

    /** The material difference after this move is played. */
    materialDifference: number;

    /** Whether the game is over after the move is played. */
    gameOver: boolean;

    /** Whether it is a draw after the move is played. */
    isDraw: boolean;

    /** Whether it is stalemate after the move is played. */
    isStalemate: boolean;

    /** Whether there is insufficient checkmating material after the move is played. */
    isInsufficientMaterial: boolean;

    /** Whether it is threefold repetition after the move is played. */
    isThreefoldRepetition: boolean;

    /** Whether it is checkmate after the move is played. */
    isCheckmate: boolean;

    /** Whether it is check after the move is played. */
    inCheck: boolean;

    /** Whether the move is a null move. */
    isNullMove: boolean;

    /** Whether a draw was offered on this move. */
    drawOffer?: boolean;

    /** The NAGs assigned to the move. */
    nags?: string[];

    /** The comment on the move. */
    commentMove?: string;

    /** The comment after the move. */
    commentAfter?: string;

    /** The diagram comment on the move. */
    commentDiag?: DiagramComment;

    /** Optional, user-defined data associated with the move. */
    userData?: unknown;
};

/** The notation for a null move. */
export const nullMoveNotation = 'Z0';

export interface HistoryRenderOptions {
    /** Whether to skip rendering the comments. */
    skipComments?: boolean;

    /** Whether to skip rendering the variations. */
    skipVariations?: boolean;

    /** Whether to skip rendering the NAGs. */
    skipNags?: boolean;
}

export class History {
    setUpFen: string;
    setUpPly: number;
    moves: Move[] = [];

    /**
     * Creates a new History object.
     * @param moves The moves to initialize the History with.
     * @param setUpFen The initial FEN. Defaults to starting position FEN.
     * @param strict Whether to use the strict SAN parser. Defaults to false.
     */
    constructor(moves: PgnMove[], setUpFen: string = FEN.start, strict = false) {
        this.setUpFen = setUpFen;

        const fenTokens = setUpFen.split(/\s+/);
        const colorToPlay = fenTokens[1];
        const moveNumber = parseInt(fenTokens[5]);

        this.setUpPly = 2 * moveNumber;
        if (colorToPlay === 'w') {
            this.setUpPly -= 1;
        }

        if (moves.length === 0) {
            this.clear();
        } else {
            this.moves = this.traverse(moves, setUpFen, null, this.setUpPly, strict);
        }
    }

    /**
     * Removes all moves from the history, but preserves the setup FEN and ply.
     */
    clear() {
        this.moves = [];
    }

    /**
     * Traverses the given set of PgnMoves and converts them to the full Move tree.
     * @param pgnMoves The moves to traverse and convert.
     * @param fen The FEN to start from.
     * @param parent The parent move to start from.
     * @param ply The ply of the next move.
     * @param strict Whether to use the strict SAN praser. Defaults to false.
     * @returns The list of Moves.
     */
    traverse(pgnMoves: PgnMove[], fen: string, parent: Move | null = null, ply = 1, strict = false): Move[] {
        const moves: Move[] = [];

        try {
            const chess = new Chess(fen);
            let previousMove = parent;

            for (const pgnMove of pgnMoves) {
                const notation = pgnMove.notation.notation;
                const chessJsMove =
                    notation === nullMoveNotation ? getNullMove(chess) : chess.move(notation, { strict });
                if (!chessJsMove) {
                    throw new Error(`Invalid move ${notation} at position ${chess.fen()}`);
                }

                const move = this.getMove(ply, pgnMove, chessJsMove, chess);
                if (previousMove) {
                    move.previous = previousMove;
                    if (!previousMove.next) {
                        previousMove.next = move;
                    }
                }

                const parsedVariations = pgnMove.variations;
                if (parsedVariations.length > 0) {
                    const lastFen = moves.length > 0 ? moves[moves.length - 1].fen : fen;
                    for (let parsedVariation of parsedVariations) {
                        const variation = this.traverse(parsedVariation, lastFen, previousMove, ply, strict);
                        if (variation.length > 0) {
                            move.variations.push(variation);
                        }
                    }
                }
                move.variation = moves;
                moves.push(move);
                previousMove = move;

                ply++;
            }
        } catch (err) {
            console.error(err);
        }

        return moves;
    }

    /**
     * Returns the Move object for the given data.
     * @param ply The ply of the move.
     * @param pgnMove The move from the PGN parser library.
     * @param chessJsMove The move from the Chess.js library.
     * @param chess The Chess.js instance.
     * @returns The Move object for the given data.
     */
    getMove(ply: number, pgnMove: PgnMove, chessJsMove: ChessJsMove, chess: Chess): Move {
        const move: Move = {
            ...chessJsMove,
            previous: null,
            next: null,
            ply,
            fen: chessJsMove.after,
            uci: chessJsMove.from + chessJsMove.to + (chessJsMove.promotion ? chessJsMove.promotion : ''),
            variation: [],
            variations: [],
            gameOver: chess.isGameOver(),
            isDraw: chess.isDraw(),
            isStalemate: chess.isStalemate(),
            isInsufficientMaterial: chess.isInsufficientMaterial(),
            isThreefoldRepetition: chess.isThreefoldRepetition(),
            isCheckmate: chess.isCheckmate(),
            inCheck: chess.inCheck(),
            isNullMove: chessJsMove.san === nullMoveNotation,
            drawOffer: pgnMove.drawOffer,
            nags: pgnMove.nags,
            commentMove: pgnMove.commentMove,
            commentAfter: pgnMove.commentAfter,
            commentDiag: convertChesscomHighlights(pgnMove.commentDiag),
            materialDifference: getMaterialDifference(chessJsMove.after),
        };
        return move;
    }

    /**
     * Returns a list of moves leading up to and including the provided move,
     * which may be in a variation.
     * @param move The move to get the history for.
     * @return The history of the given move, including the move itself.
     */
    historyToMove(move: Move): Move[] {
        const moves: Move[] = [];
        let pointer = move;
        moves.push(pointer);
        while (pointer.previous) {
            moves.push(pointer.previous);
            pointer = pointer.previous;
        }
        return moves.reverse();
    }

    /**
     * Validates whether a move would be legal and returns the Move object if so,
     * but does not add it to the history. If the move is illegal, then null is
     * returned.
     * @param notation Either a SAN string or an object representing the move.
     * @param previous The previous Move to play from or null to play from the starting position.
     * @param disableNullMoves Whether to disable null moves. If true and a null move is passed, null is returned.
     * @param strict Whether to use the strict notation parser. Defaults to false.
     * @returns The Move object if legal, or null if illegal.
     */
    validateMove(
        notation: CandidateMove,
        {
            previous,
            disableNullMoves = false,
            strict = false,
        }: { previous: Move | null; disableNullMoves?: boolean; strict?: boolean }
    ): Move | null {
        const chess = new Chess();
        if (previous) {
            chess.load(previous.fen);
        } else if (this.setUpFen) {
            chess.load(this.setUpFen);
        }

        try {
            const chessJsMove = isNullMove(notation, chess)
                ? getNullMove(chess, { disableNullMoves })
                : chess.move(notation, { strict });
            if (chessJsMove) {
                return this.getMove(previous ? previous.ply + 1 : this.setUpPly, {} as PgnMove, chessJsMove, chess);
            }
        } catch (err) {
            console.error(err);
        }
        return null;
    }

    /**
     * Adds the given move to the history and returns the Move. If the move is illegal,
     * an error is thrown.
     * @param notation Either a SAN string or an object representing the move.
     * @param previous The previous Move to play from or null to play from the starting position.
     * @param disableNullMoves Whether to disable null moves. If true and a null move is passed, an error is thrown.
     * @param strict Whether to use the strict notation parser. Defaults to false.
     * @returns The added Move object.
     */
    addMove(
        notation: CandidateMove,
        {
            previous,
            disableNullMoves = false,
            strict = false,
        }: { previous: Move | null; disableNullMoves?: boolean; strict?: boolean }
    ): Move {
        const move = this.validateMove(notation, { previous, disableNullMoves, strict });
        if (!move) {
            throw new Error(`Invalid move: ${notation.toString()} from previous ${previous}`);
        }

        move.previous = previous;
        if (previous) {
            if (previous.next) {
                previous.next.variations.push([]);
                move.variation = previous.next.variations[previous.next.variations.length - 1];
                move.variation.push(move);
            } else {
                previous.next = move;
                move.variation = previous.variation;
                previous.variation.push(move);
            }
        } else if (this.moves.length > 0) {
            this.moves[0].variations.push([]);
            move.variation = this.moves[0].variations[this.moves[0].variations.length - 1];
            move.variation.push(move);
        } else {
            move.variation = this.moves;
            this.moves.push(move);
        }
        return move;
    }

    /**
     * Returns the history as a string, using the provided options.
     * @param options An object that controls which fields are included in the output.
     * @returns The history as a PGN string.
     */
    render(options?: HistoryRenderOptions) {
        const renderVariation = (variation: Move[], needReminder = false) => {
            let result = '';
            for (let move of variation) {
                if (!options?.skipComments && move.commentMove) {
                    result += `{ ${move.commentMove} } `;
                    needReminder = true;
                }

                if (move.ply % 2 === 1) {
                    result += Math.floor(move.ply / 2) + 1 + '. ';
                } else if (result.length === 0 || needReminder) {
                    result += move.ply / 2 + '... ';
                }
                needReminder = false;

                result += move.san + ' ';

                if (!options?.skipNags && move.nags) {
                    result += move.nags.join(' ') + ' ';
                }

                if (!options?.skipComments && move.commentAfter) {
                    result += `{ ${move.commentAfter} } `;
                    needReminder = true;
                }

                if (!options?.skipComments && move.commentDiag) {
                    result += renderCommands(move.commentDiag);
                }

                if (!options?.skipVariations && move.variations.length > 0) {
                    for (let variation of move.variations) {
                        result += '(' + renderVariation(variation) + ') ';
                        needReminder = true;
                    }
                }
                result += ' ';
            }
            return result;
        };

        let ret = renderVariation(this.moves);
        // remove spaces before brackets and double spaces
        ret = ret.replace(/\s+\)/g, ')');
        ret = ret.replace(/  /g, ' ').trim();
        return ret;
    }
}

/**
 * Returns the given FEN with the side to move switched to the opposite color.
 * @param fen The FEN to switch turns for.
 * @returns The same position but with the opposite color to move.
 */
function switchTurn(fen: string): string {
    const tokens = fen.split(/\s+/);
    if (tokens.length < 2) {
        throw new Error(`FEN ${fen} is invalid`);
    }

    tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
    return tokens.join(' ');
}

/**
 * Returns true if the provided candidate is a null move (either the Z0
 * notation or moving the kings onto each other).
 * @param candidate The candidate move to check.
 * @param chess The Chess.js instance.
 * @returns True if the candidate is a null move.
 */
export function isNullMove(candidate: CandidateMove, chess: Chess): boolean {
    if (typeof candidate === 'string') {
        return candidate === nullMoveNotation;
    }

    const from = chess.get(candidate.from);
    if (from.type !== KING || from.color !== chess.turn()) {
        return false;
    }

    const to = chess.get(candidate.to);
    return to.type === KING && to.color !== chess.turn();
}

/**
 * Makes a null move in the given Chess.js instance. The Move object is returned, or null
 * is returned if a null move is illegal in the given position. Null moves are illegal if
 * the game is over or it is check.
 * @param chess The Chess.js instance.
 * @returns A Chess.js Move object for a null move, or null if a null move is illegal.
 */
export function getNullMove(chess: Chess, options: MovesOptions = {}): ChessJsMove | null {
    if (options.disableNullMoves || (options.piece && options.piece !== KING)) {
        return null;
    }
    if (chess.isCheck() || chess.isGameOver()) {
        return null;
    }

    const before = chess.fen();
    const color = chess.turn();
    const after = switchTurn(before);
    let from: Square | undefined = undefined;
    let to: Square | undefined = undefined;

    for (const ranks of chess.board()) {
        for (const square of ranks) {
            if (square?.type === KING) {
                if (square.color === color) {
                    from = square.square;
                    if (options.square && from !== options.square) {
                        return null;
                    }
                } else {
                    to = square.square;
                }

                if (from && to) {
                    chess.load(after);
                    return {
                        color,
                        from,
                        to,
                        piece: KING,
                        flags: 'n',
                        san: 'Z0',
                        lan: 'Z0',
                        before,
                        after,
                    };
                }
            }
        }
    }

    throw new Error(`Invalid FEN for null move: ${before}`);
}

/**
 * Returns the diagram comment as a string by encoding the commands into
 * PGN format.
 * @param commentDiag The comment to convert to a string.
 * @returns A PGN string of the comment.
 */
function renderCommands(commentDiag: DiagramComment): string {
    const { colorArrows, colorFields, comment, ...rest } = commentDiag;

    if (comment && Object.keys(commentDiag).length === 1) {
        return '';
    }

    let result = '{ ';

    if (colorArrows && colorArrows.length > 0) {
        result += `[%cal ${colorArrows.join(',')}]`;
    }
    if (colorFields && colorFields.length > 0) {
        result += `[%csl ${colorFields.join(',')}]`;
    }

    Object.entries(rest).forEach(([k, v]) => {
        if (k === 'clk' && v && typeof v === 'string') {
            const tokens = v.split(':');
            while (tokens.length < 3) {
                tokens.unshift('00');
            }
            result += `[%clk ${tokens.join(':')}]`;
        } else if (v) {
            result += `[%${k} ${v}]`;
        }
    });

    result += ' } ';
    return result;
}

/**
 * Converts Chess.com highlights and arrows to Lichess format. The updated DiagramComment
 * is returned.
 * @param commentDiag The DiagramComment to update.
 * @returns The DiagramComment with Chess.com highlights/arrows added to the colorFields/colorArrows fields.
 */
function convertChesscomHighlights(commentDiag?: DiagramComment): DiagramComment | undefined {
    if (!commentDiag?.c_highlight && !commentDiag?.c_arrow) {
        return commentDiag;
    }

    if (!commentDiag.colorFields) {
        commentDiag.colorFields = [];
    }
    if (!commentDiag.colorArrows) {
        commentDiag.colorArrows = [];
    }

    const highlight = commentDiag.c_highlight;
    if (highlight && typeof highlight === 'string') {
        const highlights = highlight.split(',');
        for (const h of highlights) {
            const tokens = h.split(';');
            const square = tokens[0];
            const color = getColorFromChesscomKeypress(tokens[2]);
            if (square && color) {
                commentDiag.colorFields.push(`${color}${square}`);
            }
        }
    }

    const arrow = commentDiag.c_arrow;
    if (arrow && typeof arrow === 'string') {
        const arrows = arrow.split(',');
        for (const a of arrows) {
            const tokens = a.split(';');
            const squares = tokens[0];
            const color = getColorFromChesscomKeypress(tokens[2]);
            if (squares && color) {
                commentDiag.colorArrows.push(`${color}${squares}`);
            }
        }
    }

    return commentDiag;
}

/**
 * Returns the Lichess color for the given Chess.com keypress.
 * @param keypress The keypress from the Chess.com highlight command.
 * @returns The Lichess color from the given Chess.com keypress.
 */
function getColorFromChesscomKeypress(keypress: string | undefined) {
    switch (keypress) {
        case 'shift':
            return 'G';
        case 'ctrl':
            return 'Y';
        case 'alt':
            return 'B';
        case 'none':
            return 'R';
    }
    return 'R';
}

const fenValues: Record<string, number> = {
    p: -1,
    n: -3,
    b: -3,
    r: -5,
    q: -9,
    P: 1,
    N: 3,
    B: 3,
    R: 5,
    Q: 9,
};

/**
 * Returns the material difference for the given position.
 * @param fen The FEN to get the material difference for.
 * @returns The material difference in the position.
 */
function getMaterialDifference(fen: string): number {
    const pieces = fen.split(' ')[0];
    let materialDiff = 0;
    for (const char of pieces) {
        materialDiff += fenValues[char] || 0;
    }
    return materialDiff;
}
