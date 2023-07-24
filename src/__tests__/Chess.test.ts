/**
 * @author Stefan Haack (https://shaack.com)
 */
import { TAGS } from '../Header';
import { Chess, COLOR, EventType, FEN } from '../Chess';

describe('Chess', function () {
    it('should create empty Chess', () => {
        const chess = new Chess();
        expect(chess.history().length).toBe(0);
        expect(Object.keys(chess.header()).length).toBe(0);
        expect(chess.fen()).toBe(FEN.start);
    });

    it('should load a game from FEN', function () {
        const fen = '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1';
        const chess = new Chess(fen);
        expect(chess.pgn.header.tags[TAGS.FEN]).toBe(fen);
        expect(chess.fen()).toBe(fen);
        expect(chess.piece('e1')?.type).toBe('k');
        expect(chess.piece('e1')?.color).toBe('w');
    });

    it('should load a pgn with SetUp and FEN', function () {
        const pgn = `[SetUp "1"]
[FEN "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1"]

1. e4 (1. d4 {Die Variante} d5) e5 {Ein Kommentar} 2. a3`;
        const chess = new Chess({ pgn: pgn });
        expect(chess.move('Nc6')).toBe(null);
        const result = chess.move('h6');
        expect(result?.fen).toBe('4k3/pppp1pp1/7p/4p3/4P3/P7/1PPP1PPP/4K3 w - - 0 3');
    });

    it('should load a pgn', function () {
        const chess = new Chess();
        const pgn = `[Event "IBM Kasparov vs. Deep Blue Rematch"]
[Site "New York, NY USA"]
[Date "1997.05.11"]
[Round "6"]
[White "Deep Blue"]
[Black "Kasparov, Garry"]
[Opening "Caro-Kann: 4...Nd7"]
[ECO "B17"]
[Result "1-0"]

1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Ng5 Ngf6 6.Bd3 e6 7.N1f3 h6
8.Nxe6 Qe7 9.O-O fxe6 10.Bg6+ Kd8 {Kasparov schüttelt kurz den Kopf}
11.Bf4 b5 12.a4 Bb7 13.Re1 Nd5 14.Bg3 Kc8 15.axb5 cxb5 16.Qd3 Bc6
17.Bf5 exf5 18.Rxe7 Bxe7 19.c4 1-0`;
        chess.loadPgn(pgn);
        expect(chess.history().length).toBe(37);
        expect(chess.header()[TAGS.White]).toBe('Deep Blue');
        const firstMove = chess.history()[0];
        expect(firstMove.color).toBe('w');
        expect(firstMove.san).toBe('e4');
        expect(firstMove.fen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
        expect(chess.history()[19].commentAfter).toBe('Kasparov schüttelt kurz den Kopf');
    });

    it('should load a pgn with SetUp', () => {
        const pgn = `[Event "?"]
[White "?"]
[Black "?"]
[Result "0-1"]
[SetUp "1"]
[FEN "5rk1/2nb1p1p/1p4p1/p2p2P1/1p2qP1P/1P2P3/P1Q1NK2/1B5R w - - 0 1"]

1. Qc1 Qe6 2. Qxc7
0-1`;
        const chess = new Chess({ pgn: pgn });
        expect(chess.history()[2].san).toBe('Qxc7');
    });

    it('should parse stappenmethode weekly.pgn', () => {
        const chess = new Chess();
        const pgn = `[Event "?"]
[Site "?"]
[Date "2012.??.??"]
[Round "?"]
[White "Schaak opheffen"]
[Black "Materiaal"]
[Result "0-1"]
[Annotator "S3"]
[Annotator "app 037-1"]
[SetUp "1"]
[FEN "r1b1Q1k1/1p2bpqp/8/8/p1Pr4/4PpN1/P6P/R4RK1 b - - 0 1"]

1... Bf8 (1... Qf8? 2. Qxf8+ Bxf8 3. exd4) 2. exd4 Qxd4+ {%Q} 3. Kh1 Bh3
0-1`;
        chess.loadPgn(pgn);
        expect(5).toBe(chess.pgn.history.moves.length);
        expect('Schaak opheffen').toBe(chess.pgn.header.tags[TAGS.White]);
        expect('app 037-1').toBe(chess.pgn.header.tags[TAGS.Annotator]);
    });

    it('should allow traverse through moves', () => {
        const chess = new Chess();
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`;
        chess.loadPgn(pgn);
        expect(chess.turn()).toBe(COLOR.black);
        const firstMove = chess.history()[0];
        expect(firstMove.san).toBe('Qc5+');
        const secondMove = firstMove.next;
        expect(secondMove?.san).toBe('Kd3');
        expect(chess.lastMove()?.san).toBe('Bc5#');
        expect(chess.isGameOver()).toBe(true);
        expect(chess.lastMove()?.isCheckmate).toBe(true);
        expect(chess.isCheckmate()).toBe(true);
        expect(chess.isDraw()).toBe(false);
        expect(chess.renderPgn()).toBe(
            `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`
        );
    });

    it('should add move at the end of the history', () => {
        const chess = new Chess();
        expect(chess.turn()).toBe(COLOR.white);
        chess.move('e4');
        expect(chess.turn()).toBe(COLOR.black);
        expect(chess.history()[0].san).toBe('e4');
        chess.move('e5');
        expect(chess.turn()).toBe(COLOR.white);
    });

    it('should provide correct turn after loading a FEN', () => {
        const chess = new Chess();
        chess.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        expect(chess.turn()).toBe(COLOR.black);
    });

    it('invalid move should return `null`', () => {
        const chess = new Chess();
        chess.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        expect(chess.turn()).toBe(COLOR.black);
        // assert.notEqual(chess.validateMove("a1"), null)
        const move = chess.move('a1');
        expect(move).toBe(null);
    });

    it('should return pieces', () => {
        const chess = new Chess();
        expect(chess.pieces().length).toBe(32);
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5#
1-0`;
        chess.loadPgn(pgn);
        expect(chess.pieces('k').length).toBe(2);
    });

    it('should undo lastMove', () => {
        const chess = new Chess();
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5#
1-0`;
        chess.loadPgn(pgn);
        expect(chess.history().length).toBe(9);
        chess.delete();
        expect(chess.history().length).toBe(8);
    });

    it('should undo more moves', () => {
        const chess = new Chess();
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5#
1-0`;
        chess.loadPgn(pgn);
        chess.delete(chess.history()[5]);
        // console.log(chess.history());
        expect(chess.history().length).toBe(5);
        expect(chess.plyCount()).toBe(5);
        expect(chess.fenOfPly(0)).toBe('8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1');
        expect(chess.fenOfPly(3)).toBe('8/8/b2Bq3/8/4p3/3k1pP1/2Q5/3K4 b - - 3 2');
    });

    it('should not load incorrect FEN', function () {
        const fen = '4k3/pppppppp/8/8/8/8/PPPPPP/4K3 w - - 0 1';
        try {
            new Chess(fen);
            fail();
        } catch (e) {
            // OK
        }
        try {
            const chess = new Chess();
            chess.load(fen);
            fail();
        } catch (e) {
            // OK
        }
    });

    it('should load different PGNs and then work correctly', function () {
        const fen = 'ppppkppp/pppppppp/pppppppp/pppppppp/8/8/8/RNBQKBNR w KQ - 0 1';
        const chess = new Chess({ fen: fen });
        expect(chess.move('e4')).toBe(null);
        expect(chess.move('Ke2')).toBeTruthy();
        chess.load(FEN.start);
        expect(chess.move('e4')).toBeTruthy();
    });

    it('should validate Moves', function () {
        const chess = new Chess();
        expect(chess.validateMove('e4')).toBeTruthy();
        expect(chess.validateMove('e3')).toBeTruthy();
        expect(chess.validateMove('Nf3')).toBeTruthy();
        expect(chess.validateMove('xyz')).toBe(null);
        expect(chess.validateMove('e6')).toBe(null);
    });

    it('should publish events', function () {
        return new Promise<void>((resolve, reject) => {
            const chess = new Chess();
            chess.addObserver({
                types: [EventType.LegalMove],
                handler: (event) => {
                    if (event.move?.from === 'e2' && event.move?.to === 'e4') {
                        resolve();
                    } else {
                        reject('error event');
                    }
                },
            });
            chess.move('e4');
        });
    });

    it('should provide valid moves', function () {
        const chess = new Chess();
        expect(chess.moves().length).toBe(20);
        chess.move('Nc3');
        expect(chess.moves().length).toBe(20);
        chess.move('e5');
        expect(chess.moves().length).toBe(22);
        expect(JSON.stringify(chess.moves({ square: 'e2' }).map((m) => m.san))).toBe('["e3","e4"]');
        expect(JSON.stringify(chess.moves({ piece: 'n' }).map((m) => m.san))).toBe(
            '["Na4","Nb5","Nd5","Ne4","Nb1","Nf3","Nh3"]'
        );
    });

    it('should detect a check in a game without moves', function () {
        const chess = new Chess('4k3/1P6/8/b7/6r1/8/pp2PPPP/2R1KBNR w K - 0 1');
        expect(chess.isCheck()).toBeTruthy();
    });

    it('should read puzzle pgn', function () {
        const pgn = `[Event "Titled Tuesday 2nd Nov"]
[Site "chess.com INT"]
[Date "2021.11.02"]
[Round "5"]
[White "Perera Alfonso, R."]
[Black "Narayanan, Sri"]
[Result "1-0"]
[ECO "B15"]
[WhiteElo "2354"]
[BlackElo "2540"]
[Annotator "Jesse"]
[SetUp "1"]
[FEN "r1bqr1k1/pp1n1pp1/2pb1p2/8/3P1B1p/2PB3P/PPQ1NPP1/R4RK1 b - - 0 12"]
[PlyCount "16"]
[EventDate "2021.11.02"]

12... Rxe2 $2 {this is a trick problem :-) Re2 doesn't work so black
should play Nf8 with equality} (12... Nf8 $10) (12... Bxf4 $10) 13. Qxe2 Bxf4
14. Qe4 $1 $18 {whoops!} Qc7 15. Qh7+ Kf8 16. Rae1 Ne5 17. dxe5 fxe5 18. Qh8+
Ke7 19. Qxh4+ f6 20. Qxf4 1-0`;

        const chess = new Chess({ pgn });
    });

    it('should reorder variants after promotion', function () {
        const chess = new Chess();
        const e4 = chess.move('e4');
        const e6 = chess.move('e6');
        chess.seek(e4);
        chess.move('e5');
        chess.seek(e4);
        const c6 = chess.move('c6');
        chess.seek(e4);

        expect(chess.nextMove()?.san).toBe('e6');
        expect(e6?.variations[0][0].san).toBe('e5');
        expect(e6?.variations[1][0].san).toBe('c6');

        chess.promoteVariation(c6);
        console.log(chess.pgn.render());

        expect(chess.nextMove()?.san).toBe('e6');
        expect(e6?.variations[0][0].san).toBe('c6');
        expect(e6?.variations[1][0].san).toBe('e5');
    });

    it('should promote to mainline from deep variant', function () {
        const chess = new Chess();
        const e4 = chess.move('e4');
        const e6 = chess.move('e6');
        chess.seek(e4);
        chess.move('e5');
        chess.seek(e4);
        const c6 = chess.move('c6');
        const d4 = chess.move('d4');
        chess.seek(c6);
        const nf3 = chess.move('Nf3');
        chess.seek(e4);

        expect(chess.nextMove()?.san).toBe('e6');
        expect(e6?.variations[0][0].san).toBe('e5');
        expect(e6?.variations[1][0].san).toBe('c6');
        expect(d4?.variations[0][0].san).toBe('Nf3');
        expect(nf3?.variations).toHaveLength(0);

        chess.promoteVariation(nf3, true);
        expect(chess.nextMove()?.san).toBe('c6');
        expect(c6?.variations[0][0].san).toBe('e6');
        expect(c6?.variations[1][0].san).toBe('e5');
        expect(e6?.variations).toHaveLength(0);

        chess.seek(chess.nextMove());
        expect(chess.nextMove()?.san).toBe('Nf3');
        expect(nf3?.variations[0][0].san).toBe('d4');
        expect(d4?.variations).toHaveLength(0);
    });

    it('should prevent promotion of first variant', function () {
        const chess = new Chess();
        const e4 = chess.move('e4');
        const e6 = chess.move('e6');
        chess.seek(e4);
        const e5 = chess.move('e5');
        chess.seek(e4);
        const c6 = chess.move('c6');

        expect(chess.canPromoteVariation(e6)).toBe(false);
        expect(chess.canPromoteVariation(e5)).toBe(false);
        expect(chess.canPromoteVariation(c6)).toBe(true);
    });

    it('should allow promotion of first variant to mainline', function () {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.move('e6');
        chess.seek(e4);
        const e5 = chess.move('e5');
        chess.seek(e4);
        chess.move('c6');

        expect(chess.canPromoteVariation(e5, true)).toBe(true);
    });

    it('should allow promotion of variant of first move', function () {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.move('e6');
        chess.seek(null);
        const d4 = chess.move('d4');

        expect(chess.canPromoteVariation(e4, true)).toBe(false);
        expect(chess.canPromoteVariation(d4)).toBe(false);
        expect(chess.canPromoteVariation(d4, true)).toBe(true);
    });

    it('should perform promotion of variant of first move', function () {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.move('e6');
        chess.seek(null);
        const d4 = chess.move('d4');
        chess.seek(null);

        chess.promoteVariation(d4);

        expect(chess.nextMove()?.san).toBe('e4');

        chess.promoteVariation(d4, true);
        expect(chess.nextMove()?.san).toBe('d4');
    });
});
