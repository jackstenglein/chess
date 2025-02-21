/**
 * @author Stefan Haack (https://shaack.com), Jack Stenglein
 */
import { Chess, Color, EventType, FEN } from '../Chess';

describe('Chess - Constructing/Loading', () => {
    it('should create empty Chess', () => {
        const chess = new Chess();
        expect(chess.history().length).toBe(0);
        expect(Object.keys(chess.header().tags).length).toBe(0);
        expect(chess.fen()).toBe(FEN.start);
    });

    it('should load a game from FEN', () => {
        const fen = '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1';
        const chess = new Chess({ fen });
        expect(chess.pgn.header.tags.FEN).toBe(fen);
        expect(chess.fen()).toBe(fen);
        expect(chess.get('e1')?.type).toBe('k');
        expect(chess.get('e1')?.color).toBe('w');
    });

    it('should load a pgn with SetUp and FEN', () => {
        const pgn = `[SetUp "1"]
[FEN "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1"]

1. e4 (1. d4 {Die Variante} d5) e5 {Ein Kommentar} 2. a3`;
        const chess = new Chess({ pgn: pgn });
        expect(chess.move('Nc6')).toBe(null);
        const result = chess.move('h6');
        expect(result?.fen).toBe('4k3/pppp1pp1/7p/4p3/4P3/P7/1PPP1PPP/4K3 w - - 0 3');
    });

    it('should load a pgn', () => {
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
        expect(chess.header().tags.White).toBe('Deep Blue');
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
        expect(chess.pgn.history.moves.length).toBe(5);
        expect(chess.pgn.header.tags.White).toBe('Schaak opheffen');
        expect(chess.pgn.header.tags.Annotator).toBe('app 037-1');
    });

    it('should provide correct turn after loading a FEN', () => {
        const chess = new Chess();
        chess.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        expect(chess.turn()).toBe(Color.black);
    });

    it('loads PGN with black to move', () => {
        const chess = new Chess({
            pgn: `[Event "Sample Test Position: sample"]
[Site "https://lichess.org/study/6lpXkW1X/gvIssoz9"]
[Result "*"]
[Variant "Standard"]
[ECO "?"]
[Opening "?"]
[Annotator "https://lichess.org/@/jessekraai"]
[FEN "r5k1/pp2bppp/2p1pn2/3rN2q/5QP1/2BP4/PP2PP1P/R4RK1 b - - 0 1"]
[SetUp "1"]
[UTCDate "2024.04.07"]
[UTCTime "15:06:32"]

1... Nxg4! { [1] } 2. Nxg4 (2. Qxg4 Rxe5 { [1] }) 2... Bd6! 3. Qf3 Rg5 { [1] } 4. h3 f5 $19 { black is winning } *`,
        });

        expect(chess.firstMove()?.san).toBe('Nxg4');
        expect(chess.firstMove()?.ply).toBe(2);

        const pgn = chess.renderPgn();
        const newChess = new Chess({ pgn });
        expect(newChess.firstMove()?.san).toBe('Nxg4');
        expect(newChess.firstMove()?.ply).toBe(2);
    });

    it('has correct ply when loading black to move FEN', () => {
        const chess = new Chess({ fen: 'r5k1/pp2bppp/2p1pn2/3rN2q/5QP1/2BP4/PP2PP1P/R4RK1 b - - 0 1' });
        chess.move('Nxg4');
        expect(chess.firstMove()?.ply).toBe(2);
    });

    it('should load game with space in the result', () => {
        const chess = new Chess({
            pgn: `[Event "Live Chess"]
[Result "1/2 - 1/2"]

1. e4 e5 1/2 - 1/2`,
        });

        expect(chess.header().tags.Result).toBe('1/2-1/2');
    });

    it('should load puzzle pgn', () => {
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
        expect(chess.header().tags.Result).toBe('1-0');
    });

    it('should not load incorrect FEN', () => {
        const fen = '4k3/pppppppp/8/8/8/8/PPPPPP/4K3 w - - 0 1';
        try {
            new Chess({ fen });
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

    it('should load different PGNs and then work correctly', () => {
        const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
        const chess = new Chess({ fen: fen });
        expect(chess.move('e4')).toBe(null);
        expect(chess.move('Ke2')).toBeTruthy();
        chess.load(FEN.start);
        expect(chess.move('e4')).toBeTruthy();
    });

    it('should load PGN with SCID += NAG', () => {
        const chess = new Chess({ pgn: `1. e4 +=` });
        expect(chess.history()[0].nags?.[0]).toBe('$14');
    });
});

describe('Chess - Move Traversal', () => {
    it('should get first move', () => {
        const chess = new Chess();
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`;
        chess.loadPgn(pgn);

        expect(chess.firstMove()?.san).toBe('Qc5+');
    });

    it('should get last move', () => {
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`;
        const chess = new Chess({ pgn });

        expect(chess.lastMove()?.san).toBe('Bc5#');
    });

    it('should allow seeking to starting position', () => {
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`;
        const chess = new Chess({ pgn });

        chess.seek(null);
        expect(chess.fen()).toBe('8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1');
    });

    it('should allow seeking to move', () => {
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`;
        const chess = new Chess({ pgn });

        chess.seek(chess.firstMove());
        expect(chess.currentMove()?.san).toBe('Qc5+');
    });

    it('should get default next move', () => {
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`;
        const chess = new Chess({ pgn });

        expect(chess.nextMove()).toBe(null);

        chess.seek(chess.firstMove());
        expect(chess.nextMove()?.san).toBe('Kd3');
    });

    it('should get next move from provided move', () => {
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`;
        const chess = new Chess({ pgn });

        expect(chess.nextMove(chess.history()[1])?.san).toBe('Qc2+');
    });

    it('should get default previous move', () => {
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`;
        const chess = new Chess({ pgn });

        expect(chess.previousMove()?.san).toBe('Kxe3');

        chess.seek(chess.firstMove());
        expect(chess.previousMove()).toBe(null);
    });

    it('should get previous move from provided move', () => {
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]
[Result "1-0"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5# 1-0`;
        const chess = new Chess({ pgn });

        expect(chess.previousMove(chess.history()[1])?.san).toBe('Qc5+');
    });
});

describe('Chess - Making Moves', () => {
    it('should add move at the end of the history', () => {
        const chess = new Chess();
        expect(chess.turn()).toBe(Color.white);
        chess.move('e4');
        expect(chess.turn()).toBe(Color.black);
        expect(chess.history()[0].san).toBe('e4');
        chess.move('e5');
        expect(chess.turn()).toBe(Color.white);
    });

    it('invalid move should return `null`', () => {
        const chess = new Chess();
        chess.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        expect(chess.turn()).toBe(Color.black);
        const move = chess.move('a1');
        expect(move).toBe(null);
    });

    it('should allow null moves with Z0', () => {
        const chess = new Chess();
        chess.move('Z0');

        expect(chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
    });

    it('should allow null moves with from/to', () => {
        const chess = new Chess();
        chess.move({ from: 'e1', to: 'e8' });

        expect(chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
    });

    it('should allow null moves with -- in PGN', () => {
        const chess = new Chess({ pgn: '1. e4 --' });
        expect(chess.history()[1]?.san).toBe('Z0');
    });

    it('should recognize same SAN and UCI moves', () => {
        const chess = new Chess({ pgn: '1. e4' });
        chess.seek(null);
        chess.move('e2e4');
        expect(chess.history()[0].variations).toHaveLength(0);
    });

    it('should get null move after en passant (#3)', () => {
        const chess = new Chess({ fen: 'rnbqkbnr/p1pppppp/1p6/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2' });
        chess.move('d5');
        const moves = chess.moves();
        expect(moves.length).toBe(32);
    });

    it('should disable null moves with instance prop', () => {
        const chess = new Chess({ disableNullMoves: true });
        let move = chess.move('Z0');
        expect(move).toBe(null);
        move = chess.move({ from: 'e1', to: 'e8' });
        expect(move).toBe(null);
    });

    it('should override disable null moves with function prop', () => {
        const chess = new Chess({ disableNullMoves: true });
        let move = chess.move('Z0', { disableNullMoves: false });
        expect(chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
    });

    it('should validate Moves', () => {
        const chess = new Chess();
        expect(chess.validateMove('e4')).toBeTruthy();
        expect(chess.validateMove('e3')).toBeTruthy();
        expect(chess.validateMove('Nf3')).toBeTruthy();
        expect(chess.validateMove('xyz')).toBe(null);
        expect(chess.validateMove('e6')).toBe(null);
    });

    it('should provide valid moves', () => {
        const chess = new Chess();
        expect(chess.moves().length).toBe(21);
        chess.move('Nc3');
        expect(chess.moves().length).toBe(21);
        chess.move('e5');
        expect(chess.moves().length).toBe(23);
        expect(JSON.stringify(chess.moves({ square: 'e2' }).map((m) => m.san))).toBe('["e3","e4"]');
        expect(JSON.stringify(chess.moves({ piece: 'n' }).map((m) => m.san))).toBe(
            '["Na4","Nb5","Nd5","Ne4","Nb1","Nf3","Nh3"]',
        );
    });

    it('handles existingOnly', () => {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.seek(null);

        const e5 = chess.move('e5', { existingOnly: true });
        expect(e5).toBe(null);

        expect(chess.move('e4', { existingOnly: true })).toBe(e4);
    });

    it('handles skipSeek', () => {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.seek(null);

        expect(chess.move('e4', { skipSeek: true })).toBe(e4);
        expect(chess.currentMove()).toBe(null);
    });

    it('should set first move variant ply', () => {
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
should play Nf8 with equality} (12... Nf8 $10) 13. Qxe2 Bxf4
14. Qe4 $1 $18 {whoops!} Qc7 15. Qh7+ Kf8 16. Rae1 Ne5 17. dxe5 fxe5 18. Qh8+
Ke7 19. Qxh4+ f6 20. Qxf4 1-0`;

        const chess = new Chess({ pgn });
        chess.seek(null);
        const move = chess.move('Bxf4');

        expect(move?.ply).toBe(24);
    });
});

describe('Chess - Deleting Moves', () => {
    it('should delete last move', () => {
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

    it('should delete multiple moves', () => {
        const chess = new Chess();
        const pgn = `[SetUp "1"]
[FEN "8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1"]

1. Qc5+ Kd3 2. Qc2+ Kd4 3. Qd2+ Bd3 4. Qe3+ Kxe3 (4... Kc3 5. Qc1+ Kb3 6. Qa3+ Kc4 7. Qb4+ Kd5 8. Qc5#) 5. Bc5#
1-0`;
        chess.loadPgn(pgn);
        chess.delete(chess.history()[5]);
        expect(chess.history().length).toBe(5);
        expect(chess.plyCount()).toBe(5);
        expect(chess.fenOfPly(0)).toBe('8/8/b2Bq3/7Q/3kp3/5pP1/8/3K4 w - - 0 1');
        expect(chess.fenOfPly(3)).toBe('8/8/b2Bq3/8/4p3/3k1pP1/2Q5/3K4 b - - 3 2');
    });

    it('should keep variations when deleting mainline moves', () => {
        const pgn = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2023.06.21"]
[Round "-"]
[White "JackStenglein"]
[Black "LCalvary"]
[Result "0-1"]
[WhiteElo "1807"]
[BlackElo "2068"]
[TimeControl "5400+30"]
[Termination "LCalvary won by resignation"]
[UTCDate "2023.06.21"]
[UTCTime "22:39:16"]
[Variant "Standard"]
[ECO "B22"]
[Opening "Sicilian Defense: Alapin Variation"]
[Annotator "https://lichess.org/@/JackStenglein"]
[PlyCount "16"]

1. e4 { [%clk 1:30:30] } c5 { [%clk 1:30:30] } 2. c3 { [%clk 1:30:47] } Nf6 { [%clk 1:30:53] } 3. e5 { [%clk 1:31:09] } Nd5 { [%clk 1:31:22] } 4. Bc4 { [%clk 1:31:21] } Nb6 { [%clk 1:31:18] } 5. Bb3 { [%clk 1:31:38] } d5 { [%clk 1:31:07] } (5... Nd5 6. f3 (6. Nf3) (6. d4 cxd4) 6... b6) 6. d4 { [%clk 1:31:17] } cxd4 { [%clk 1:30:26] } 7. cxd4 { [%clk 1:30:50] } Bf5 { [%clk 1:29:22] } 8. Nc3 { [%clk 1:29:53] } e6 $6 { Test comment 2 } { [%c_effect e6;square;e6;type;Inaccuracy;persistent;true][%clk 1:29:07] } 0-1`;

        const chess = new Chess();
        chess.loadPgn(pgn);

        chess.seek(chess.history()[9]);
        expect(chess.currentMove()?.san).toBe('d5');
        expect(chess.currentMove()?.variations[0][0].san).toBe('Nd5');

        chess.seek(chess.currentMove()?.variations[0][1] || null);
        expect(chess.currentMove()?.san).toBe('f3');

        chess.delete();

        expect(chess.currentMove()?.san).toBe('Nd5');
        expect(chess.nextMove()?.san).toBe('Nf3');

        const nf3 = chess.nextMove();
        expect(nf3?.variations[0][0].san).toBe('d4');

        chess.delete(nf3);
        expect(chess.currentMove()?.san).toBe('Nd5');
        expect(chess.nextMove()?.san).toBe('d4');
        expect(chess.currentMove()?.variation).toHaveLength(3);
    });

    it('should handle delete before move', () => {
        const chess = new Chess();
        const firstMove = chess.move('e4');
        chess.move('e5');
        const newFirstMove = chess.move('d4');

        chess.seek(firstMove);
        chess.deleteBefore(newFirstMove);

        expect(chess.setUpFen()).toBe(newFirstMove!.before);
        expect(chess.firstMove()).toBe(newFirstMove);
        expect(chess.currentMove()).toBe(newFirstMove);
        expect(newFirstMove?.previous).toBe(null);
        expect(chess.history().length).toBe(1);
    });

    it('should keep current move when deleting before move', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.move('e5');
        const newFirstMove = chess.move('d4');
        const move = chess.move('exd4');

        chess.deleteBefore(newFirstMove);

        expect(chess.currentMove()).toBe(move);
        expect(chess.history().length).toBe(2);
    });

    it('should keep variations when deleting before move', () => {
        const chess = new Chess();
        chess.move('e4');
        const lastDeletedMove = chess.move('e5');
        const newFirstMove = chess.move('d4');
        chess.seek(newFirstMove!.previous);
        const variation = chess.move('Nf3');

        expect(variation!.previous).toBe(lastDeletedMove);

        chess.deleteBefore(newFirstMove);

        expect(chess.currentMove()).toBe(variation);
        expect(chess.history().length).toBe(1);
        expect(variation!.previous).toBe(null);
    });

    it('should reset game comment when deleting before move', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.setDrawables(['Gg1f3'], ['Rh1']);
        chess.setComment('Test');

        chess.move('e5');
        chess.deleteBefore();

        expect(chess.pgn.gameComment.colorArrows?.[0]).toBe('Gg1f3');
        expect(chess.pgn.gameComment.colorFields?.[0]).toBe('Rh1');
        expect(chess.pgn.gameComment.comment).toBe('Test');
    });
});

describe('Chess - Promoting Variations', () => {
    it('should reorder variants after promotion', () => {
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

        expect(chess.nextMove()?.san).toBe('e6');
        expect(e6?.variations[0][0].san).toBe('c6');
        expect(e6?.variations[1][0].san).toBe('e5');
    });

    it('should promote to mainline from deep variant', () => {
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

    it('should prevent promotion of first variant', () => {
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

    it('should allow promotion of first variant to mainline', () => {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.move('e6');
        chess.seek(e4);
        const e5 = chess.move('e5');
        chess.seek(e4);
        chess.move('c6');

        expect(chess.canPromoteVariation(e5, true)).toBe(true);
    });

    it('should allow promotion of variant of first move', () => {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.move('e6');
        chess.seek(null);
        const d4 = chess.move('d4');

        expect(chess.canPromoteVariation(e4, true)).toBe(false);
        expect(chess.canPromoteVariation(d4)).toBe(false);
        expect(chess.canPromoteVariation(d4, true)).toBe(true);
    });

    it('should perform promotion of variant of first move', () => {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.move('e6');
        chess.seek(null);
        const d4 = chess.move('d4');
        chess.seek(null);

        chess.promoteVariation(d4);

        expect(chess.nextMove()?.san).toBe('e4');
        expect(chess.firstMove()?.san).toBe('e4');
        expect(e4?.variations[0][0].san).toBe('d4');

        chess.promoteVariation(d4, true);
        expect(chess.nextMove()?.san).toBe('d4');
        expect(d4?.variations[0][0].san).toBe('e4');
        expect(e4?.variations).toHaveLength(0);
        expect(chess.firstMove()?.san).toBe('d4');
        expect(chess.isInMainline(d4)).toBeTruthy();
    });
});

describe('Chess - Observers', () => {
    it('should publish events', () => {
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
});

describe('Chess - Rendering', () => {
    it('renders correct clk pgn', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.setCommand('clk', '30:40');

        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n1. e4 { [%clk 00:30:40] } *');
    });

    it('skips clk pgn if necessary', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.setCommand('clk', '30:40');

        const pgn = chess.renderPgn({ skipClocks: true });
        expect(pgn).toBe('\n1. e4 *');
    });

    it('renders correct PGN for no moves', () => {
        const chess = new Chess({ fen: 'r5k1/pp2bppp/2p1pn2/3rN2q/5QP1/2BP4/PP2PP1P/R4RK1 b - - 0 1' });
        expect(chess.renderPgn()).toBe(
            '[FEN "r5k1/pp2bppp/2p1pn2/3rN2q/5QP1/2BP4/PP2PP1P/R4RK1 b - - 0 1"]\n[SetUp "1"]\n\n*',
        );
    });

    it('renders blank PGN', () => {
        const chess = new Chess({ pgn: '' });
        chess.setHeader('White', 'Test');
        expect(chess.renderPgn()).toBe('[White "Test"]\n\n*');
    });

    it('renders headers with escaped quotes', () => {
        const chess = new Chess({
            pgn: '[Event "Classicals: Algimantas Ogintas (1724) - Killane Cup with \\"The Town\\" OTB"]\n\n*',
        });
        expect(chess.header().tags.Event).toBe(
            'Classicals: Algimantas Ogintas (1724) - Killane Cup with "The Town" OTB',
        );

        const pgn = chess.renderPgn();
        expect(pgn).toBe(
            '[Event "Classicals: Algimantas Ogintas (1724) - Killane Cup with \\"The Town\\" OTB"]\n[Result "*"]\n\n*',
        );

        const newChess = new Chess({ pgn });
        expect(newChess.header().tags.Event).toBe(
            'Classicals: Algimantas Ogintas (1724) - Killane Cup with "The Town" OTB',
        );
    });

    it('renders PGN with drawables in game comment', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.seek(null);
        chess.setDrawables(['Gf1e2'], ['Rh1']);

        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n{ [%cal Gf1e2][%csl Rh1] } \n1. e4 *');
    });

    it('renders PGN with comment and drawables in game comment', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.seek(null);
        chess.setDrawables(['Gf1e2'], ['Rh1']);
        chess.setComment('Test');

        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n{ Test }{ [%cal Gf1e2][%csl Rh1] } \n1. e4 *');
    });

    it('renders reminder if white move has drawables', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.setDrawables([], ['Rh1']);
        chess.move('e5');

        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n1. e4 { [%csl Rh1] } 1... e5 *');
    });

    it('renders PGN with variation', () => {
        const chess = new Chess({ pgn: '1. e4 (1. d4)' });
        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n1. e4 (1. d4) *');
    });

    it('skips rendering variations if necessary', () => {
        const chess = new Chess({ pgn: '1. e4 (1. d4)' });
        const pgn = chess.renderPgn({ skipVariations: true });
        expect(pgn).toBe('\n1. e4 *');
    });

    it('renders PGN with NAGs', () => {
        const chess = new Chess({ pgn: '1. e4!' });
        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n1. e4 $1 *');
    });

    it('skips rendering NAGs if necessary', () => {
        const chess = new Chess({ pgn: '1. e4!' });
        const pgn = chess.renderPgn({ skipNags: true });
        expect(pgn).toBe('\n1. e4 *');
    });

    it('renders PGN with drawables', () => {
        const chess = new Chess({ pgn: '1. e4 {[%cal Ge4e5]}' });
        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n1. e4 { [%cal Ge4e5] } *');
    });

    it('skips rendering drawables if necessary', () => {
        const chess = new Chess({ pgn: '1. e4 {[%cal Ge4e5]}' });
        const pgn = chess.renderPgn({ skipDrawables: true });
        expect(pgn).toBe('\n1. e4 *');
    });

    it('renders PGN with color fields', () => {
        const chess = new Chess({ pgn: '1. e4 {[%csl Gf2]}' });
        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n1. e4 { [%csl Gf2] } *');
    });

    it('skips rendering color fields if necessary', () => {
        const chess = new Chess({ pgn: '1. e4 {[%csl Gf2]}' });
        const pgn = chess.renderPgn({ skipDrawables: true });
        expect(pgn).toBe('\n1. e4 *');
    });

    it('renders PGN with comments', () => {
        const chess = new Chess({ pgn: '1. e4 {best by test! }' });
        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n1. e4 { best by test! } *');
    });

    it('skips rendering comments if necessary', () => {
        const chess = new Chess({ pgn: '1. e4 {best by test! }' });
        const pgn = chess.renderPgn({ skipComments: true });
        expect(pgn).toBe('\n1. e4 *');
    });

    it('renders PGN with null moves', () => {
        const chess = new Chess({ pgn: '1. e4 Z0' });
        const pgn = chess.renderPgn();
        expect(pgn).toBe('\n1. e4 Z0 *');
    });

    it('skips rendering null moves if necessary', () => {
        const chess = new Chess({ pgn: '1. e4 Z0' });
        const pgn = chess.renderPgn({ skipNullMoves: true });
        expect(pgn).toBe('\n1. e4 *');
    });

    it('renders specific line', () => {
        const chess = new Chess();
        const e4 = chess.move('e4');
        chess.move('e5');
        chess.move('d4');
        chess.seek(null);
        chess.move('c4');

        chess.seek(e4);
        const c5 = chess.move('c5');
        const c3 = chess.move('c3');
        chess.seek(c5);
        chess.move('Nf3');

        const pgn = chess.renderLine(c3);
        expect(pgn).toBe('\n1. e4 (1. c4) 1... c5 2. c3 (2. Nf3)');
    });

    it('renderFrom(null) is equivalent to renderPgn', () => {
        const chess = new Chess({ pgn: '1. e4 (1. d4)' });
        const pgn = chess.renderPgn();
        expect(chess.renderFrom(null)).toBe(pgn);
    });

    it('renders from specific move', () => {
        const chess = new Chess({ pgn: '1. e4 (1. d4 d5 2. c4 dxc4)' });
        const d4 = chess.history()[0]?.variations[0][0];
        expect(chess.renderFrom(d4)).toBe(
            `[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]\n[SetUp "1"]\n\n1. d4 d5 2. c4 dxc4`,
        );
    });
});

describe('Chess - Miscellaneous', () => {
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

    it('should detect a check in a game without moves', () => {
        const chess = new Chess({ fen: '4k3/1P6/8/b7/6r1/8/pp2PPPP/2R1KBNR w K - 0 1' });
        expect(chess.isCheck()).toBeTruthy();
    });

    it('returns correct material difference', () => {
        const chess = new Chess();
        expect(chess.materialDifference()).toBe(0);

        chess.move('e4');
        expect(chess.currentMove()?.materialDifference).toBe(0);
        expect(chess.materialDifference()).toBe(0);

        chess.move('d5');
        chess.move('exd5');
        expect(chess.currentMove()?.materialDifference).toBe(1);
        expect(chess.materialDifference()).toBe(1);

        chess.move('Qxd5');
        expect(chess.currentMove()?.materialDifference).toBe(0);
        expect(chess.materialDifference()).toBe(0);

        chess.move('Nc3');
        chess.move('Nf6');
        chess.move('Nxd5');
        chess.move('Nxd5');
        expect(chess.currentMove()?.materialDifference).toBe(6);
        expect(chess.materialDifference()).toBe(6);
    });

    it('returns correct material difference on start position', () => {
        const chess = new Chess({ fen: 'rnbqkbnr/ppppp1pp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' });
        expect(chess.materialDifference()).toBe(1);
    });

    it('should set PlyCount header', () => {
        const chess = new Chess();
        chess.setHeader('PlyCount', '13');
        expect(chess.header().getRawValue('PlyCount')).toBe('13');
        expect(chess.header().valueMap().PlyCount).toBe('13');
    });
});
