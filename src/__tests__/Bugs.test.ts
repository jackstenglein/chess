/**
 * Regression tests for previously reproduced bugs.
 */
import { Chess, CommentType, FEN, normalizeFen } from '../Chess';
import { Header } from '../Header';
import { Pgn } from '../Pgn';

describe('Bugs - delete() variation tree integrity', () => {
    it('should promote the first variation when deleting the first move', () => {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.seek(null);
        chess.move('d4');

        chess.delete(e4);

        expect(chess.history().map((m) => m.san)).toEqual(['d4']);
        expect(chess.firstMove()?.san).toBe('d4');
        expect(chess.isInMainline(chess.firstMove()!)).toBe(true);
    });

    it('should rewire all promoted moves onto the mainline after delete', () => {
        const chess = new Chess();
        chess.move('e4');
        const e5 = chess.move('e5');
        chess.seek(chess.firstMove());
        chess.move('c5');
        chess.move('d4');

        chess.delete(e5);

        const history = chess.history();
        expect(history.map((m) => m.san)).toEqual(['e4', 'c5', 'd4']);

        for (const move of history) {
            expect(chess.isInMainline(move)).toBe(true);
            expect(move.variation).toBe(chess.pgn.history.moves);
        }

        // Mainline-only APIs must work for promoted continuations
        chess.deleteBefore(history[2]);
        expect(chess.history().map((m) => m.san)).toEqual(['d4']);
    });

    it('should not treat unrelated variations as descendants of a mainline move', () => {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.move('e5');
        chess.seek(null);
        chess.move('d4');
        const d5 = chess.move('d5');

        expect(chess.isDescendant(e4!, d5)).toBe(false);
    });

    it('should not seek away when deleting a mainline move while on an unrelated variation', () => {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.move('e5');
        chess.seek(null);
        chess.move('d4');
        const d5 = chess.move('d5');

        chess.delete(e4);

        expect(chess.currentMove()).toBe(d5);
        expect(chess.currentMove()?.san).toBe('d5');
    });
});

describe('Bugs - draw detection', () => {
    it('should count the setup position for threefold repetition', () => {
        const chess = new Chess();
        for (const san of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) {
            expect(chess.move(san)).not.toBeNull();
        }

        // Back at the starting position for the third time
        expect(chess.normalizedFen()).toBe(normalizeFen(FEN.start));
        expect(chess.isThreefoldRepetition()).toBe(true);
        expect(chess.isDraw()).toBe(true);
    });

    it('should honor the FEN halfmove clock for the fifty-move rule', () => {
        const setup = '4k3/8/8/8/8/8/8/4K3 w - - 99 50';
        const chess = new Chess({ fen: setup });
        expect(chess.move({ from: 'e1', to: 'd1' })).not.toBeNull();
        expect(chess.fen().split(' ')[4]).toBe('100');
        expect(chess.isDrawByFiftyMoves()).toBe(true);
    });

    it('should detect fifty-move draw from a loaded FEN with halfmove 100', () => {
        const chess = new Chess({ fen: '4k3/8/8/8/8/8/8/4K3 w - - 100 50' });
        expect(chess.isDrawByFiftyMoves()).toBe(true);
        expect(chess.isDraw()).toBe(true);
    });
});

describe('Bugs - load / chessjs sync and null moves', () => {
    it('should sync chessjs when load() is called', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.load(FEN.start);

        expect(chess.fen()).toBe(FEN.start);
        expect(chess.chessjs.fen()).toBe(FEN.start);
    });

    it('should sync chessjs when loadPgn() is called', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.loadPgn('1. d4 d5 *');

        expect(chess.fen()).toBe(chess.lastMove()!.after);
        expect(chess.chessjs.fen()).toBe(chess.fen());
    });

    it('should not mutate chessjs when generating moves that include a null move', () => {
        const chess = new Chess();
        chess.move('e4');
        const fenBefore = chess.chessjs.fen();

        chess.moves();

        expect(chess.chessjs.fen()).toBe(fenBefore);
        expect(chess.chessjs.turn()).toBe('b');
    });
});

describe('Bugs - PGN rendering', () => {
    it('should update an existing FEN header in renderFrom()', () => {
        const setup = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
        const chess = new Chess({ fen: setup });
        chess.move('e5');
        const nf3 = chess.move('Nf3');
        expect(nf3).not.toBeNull();

        const pgn = chess.renderFrom(nf3);
        const fenMatch = pgn.match(/\[FEN "([^"]+)"\]/);

        expect(fenMatch).not.toBeNull();
        expect(fenMatch![1]).toBe(chess.fen(nf3!.previous));
        expect(fenMatch![1]).not.toBe(setup);
    });

    it('should not continue rendering moves after a skipped null move', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.move('Z0');
        chess.move('e5');

        const pgn = chess.renderPgn({ skipNullMoves: true, skipHeader: true });

        expect(pgn).toContain('1. e4');
        expect(pgn).not.toContain('Z0');
        expect(pgn).not.toContain('e5');
    });

    it('should apply render options inside nested variations', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.move('e5');
        chess.seek(chess.firstMove());
        const c5 = chess.move('c5');
        chess.setComment('sideline comment', CommentType.After, c5);

        const pgn = chess.renderPgn({ skipComments: true, skipHeader: true });

        expect(pgn).toContain('c5');
        expect(pgn).not.toContain('sideline comment');
    });

    it('should keep game-comment drawables when skipComments is set', () => {
        const chess = new Chess();
        chess.setComment('opening idea');
        chess.setDrawables(['Ge2e4'], ['Ye2']);

        const pgn = chess.renderPgn({ skipComments: true });

        expect(pgn).not.toContain('opening idea');
        expect(pgn).toContain('%cal');
        expect(pgn).toContain('Ge2e4');
    });
});

describe('Bugs - History parsing and deleteBefore', () => {
    it('should not leave empty variation arrays when a sideline fails to parse', () => {
        // (1. e5) from the starting position is illegal for White
        const chess = new Chess({ pgn: '1. e4 (1. e5) e5 *' });
        const e4 = chess.firstMove();

        expect(e4?.san).toBe('e4');
        expect(e4?.variations).toEqual([]);
    });

    it('should refresh setUpMaterialDifference after deleteBefore()', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.move('d5');
        chess.move('exd5');
        const qxd5 = chess.move('Qxd5');

        // Position before Qxd5 is White +1 pawn
        expect(chess.materialDifference(qxd5!.previous)).toBe(1);

        chess.deleteBefore(qxd5);

        expect(chess.materialDifference(null)).toBe(1);
        expect(chess.pgn.history.setUpMaterialDifference).toBe(1);
    });
});

describe('Bugs - Header escaping', () => {
    it('should escape backslashes in header values for round-trip PGN', () => {
        const header = new Header({ tags: {} });
        expect(() => header.setValue('Event', 'A\\B')).not.toThrow();

        const rendered = header.render();
        expect(rendered).toContain('[Event "A\\\\B"]');

        const reparsed = new Header({ pgn: rendered });
        expect(reparsed.getRawValue('Event')).toBe('A\\B');
    });
});

describe('Bugs - Pgn constructor fen override', () => {
    it('should not overwrite a PGN FEN tag with a constructor fen argument', () => {
        const pgnFen = '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1';
        const otherFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
        const pgnText = `[SetUp "1"]
[FEN "${pgnFen}"]

1. e4 *`;
        const pgn = new Pgn({ pgn: pgnText, fen: otherFen });

        expect(pgn.header.tags.FEN).toBe(pgnFen);
        expect(pgn.history.setUpFen).toBe(pgnFen);
    });
});
