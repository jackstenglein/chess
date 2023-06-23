/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn
 * License: MIT, see file 'LICENSE'
 */
// import * as pgnParser from './parser/pgnParser.js';
import { parse, ParseTree } from '@mliebelt/pgn-parser';
import { PgnMove } from '@mliebelt/pgn-types';
import { Chess, Move as ChessJsMove } from 'chess.js';
import { Fen } from './Fen';

class IllegalMoveException {
    fen: string;
    notation: string;

    constructor(fen: string, notation: string) {
        this.fen = fen;
        this.notation = notation;
    }

    toString() {
        return 'IllegalMoveException: ' + this.fen + ' => ' + this.notation;
    }
}

export type Move = ChessJsMove & {
    next: Move | null;
    ply: number;
    previous: Move | null;
    variation: Move[];
    variations: Move[][];
    fen: string;
    uci: string;

    gameOver: boolean;
    isDraw: boolean;
    isStalemate: boolean;
    isInsufficientMaterial: boolean;
    isThreefoldRepetition: boolean;
    isCheckmate: boolean;
    inCheck: boolean;

    drawOffer?: boolean;
    nags?: string[];
    commentMove?: string;
    commentAfter?: string;
};

export class History {
    setUpFen: string | null;
    moves: Move[] = [];

    constructor(moves: PgnMove[], setUpFen: string | null = null, sloppy = false) {
        this.setUpFen = setUpFen;

        if (moves.length === 0) {
            this.clear();
        } else {
            let initialPly = 1;
            if (setUpFen) {
                const fen = new Fen(setUpFen);
                initialPly = 2 * fen.moveNumber;
                if (fen.colorToPlay === 'w') {
                    initialPly -= 1;
                }
            }

            console.log('initialPly: ', initialPly);
            this.moves = this.traverse(moves, setUpFen, null, initialPly, sloppy);
        }
    }

    clear() {
        this.moves = [];
    }

    traverse(pgnMoves: PgnMove[], fen: string | null, parent: Move | null = null, ply = 1, sloppy = false): Move[] {
        const chess = fen ? new Chess(fen) : new Chess();
        const moves: Move[] = [];
        let previousMove = parent;

        for (const pgnMove of pgnMoves) {
            const notation = pgnMove.notation.notation;
            const chessJsMove = chess.move(notation, { strict: !sloppy });

            const move = this.getMove(ply, pgnMove, chessJsMove, chess);
            if (previousMove) {
                move.previous = previousMove;
                previousMove.next = move;
            }

            const parsedVariations = pgnMove.variations;
            if (parsedVariations.length > 0) {
                const lastFen = moves.length > 0 ? moves[moves.length - 1].fen : fen;
                for (let parsedVariation of parsedVariations) {
                    move.variations.push(this.traverse(parsedVariation, lastFen, previousMove, ply, sloppy));
                }
            }
            move.variation = moves;
            moves.push(move);
            previousMove = move;

            ply++;
        }
        return moves;
    }

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
            drawOffer: pgnMove.drawOffer,
            nags: pgnMove.nag,
            commentMove: pgnMove.commentMove,
            commentAfter: pgnMove.commentAfter,
        };
        return move;
    }

    /**
     * @param move
     * @return the history to the move which may be in a variation
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
     * Don't add the move, just validate, if it would be correct
     * @param notation
     * @param previous
     * @param sloppy
     * @returns {[]|{}}
     */
    validateMove(
        notation: string | { from: string; to: string; promotion?: string },
        previous: Move | null = null,
        sloppy = true
    ): Move | null {
        if (!previous) {
            if (this.moves.length > 0) {
                previous = this.moves[this.moves.length - 1];
            }
        }
        const chess = new Chess(this.setUpFen ? this.setUpFen : undefined);
        if (previous) {
            const historyToMove = this.historyToMove(previous);
            for (const moveInHistory of historyToMove) {
                chess.move(moveInHistory);
            }
        }
        try {
            const chessJsMove = chess.move(notation, { strict: !sloppy });
            if (chessJsMove) {
                return this.getMove(previous ? previous.ply + 1 : 1, {} as PgnMove, chessJsMove, chess);
            }
        } catch (err) {
            console.error(err);
        }
        return null;
    }

    addMove(
        notation: string | { from: string; to: string; promotion?: string },
        previous: Move | null = null,
        sloppy = true
    ) {
        if (!previous) {
            if (this.moves.length > 0) {
                previous = this.moves[this.moves.length - 1];
            }
        }
        const move = this.validateMove(notation, previous, sloppy);
        if (!move) {
            throw new Error('invalid move');
        }
        move.previous = previous;
        if (previous) {
            move.ply = previous.ply + 1;
            move.uci = move.from + move.to + (move.promotion ? move.promotion : '');
            if (previous.next) {
                previous.next.variations.push([]);
                move.variation = previous.next.variations[previous.next.variations.length - 1];
                move.variation.push(move);
            } else {
                previous.next = move;
                move.variation = previous.variation;
                previous.variation.push(move);
            }
        } else {
            move.variation = this.moves;
            move.ply = 1;
            this.moves.push(move);
        }
        return move;
    }

    render(renderComments = true, renderNags = true) {
        const renderVariation = (variation: Move[], needReminder = false) => {
            let result = '';
            for (let move of variation) {
                if (move.ply % 2 === 1) {
                    result += Math.floor(move.ply / 2) + 1 + '. ';
                } else if (result.length === 0 || needReminder) {
                    result += move.ply / 2 + '... ';
                }
                needReminder = false;

                result += move.san + ' ';

                if (renderNags && move.nags) {
                    result += move.nags.join(' ') + ' ';
                }

                if (renderComments && move.commentMove) {
                    result += '{' + move.commentMove + '} ';
                    needReminder = true;
                }

                if (renderComments && move.commentAfter) {
                    result += '{' + move.commentAfter + '} ';
                    needReminder = true;
                }

                if (move.variations.length > 0) {
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
        // remove spaces before brackets
        ret = ret.replace(/\s+\)/g, ')');
        // remove double spaces
        ret = ret.replace(/\s\s+/g, ' ').trim();
        return ret;
    }
}
