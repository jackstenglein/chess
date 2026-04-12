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

    it('should load a FEN with incorrect move number', () => {
        const fen = '7k/7P/7P/1p6/6K1/8/8/8 w - - 0 0';
        const chess = new Chess({ fen });
        expect(chess.pgn.header.tags.FEN).toBe('7k/7P/7P/1p6/6K1/8/8/8 w - - 0 1');
        expect(chess.fen()).toBe('7k/7P/7P/1p6/6K1/8/8/8 w - - 0 1');
    });

    it('should load a PGN with incorrect move number', () => {
        const pgn = `[Event "?"]
[Site "?"]
[Date "2025.01.15"]
[Round "?"]
[White "Geometry of the chessboard"]
[Black "Beginner"]
[Result "*"]
[Annotator "srmci"]
[SetUp "1"]
[FEN "7k/7P/7P/1p6/6K1/8/8/8 w - - 0 0"]
[PlyCount "9"]
[SourceVersionDate "2025.01.09"]

{[%cal Rg4d7,Rd7b5,Gg4e2,Ge2b5,Yg4e4,Ye4d5,Yd5b5][%evp 0,8,0,0,0,-1032,-29972,
-29971,-29972,-29973,-29976] [#] The geometry of the chessboard can be
deceptive. When trying to catch a Passed Pawn not every path can be considered
equal. Here, there are many paths the White king can take towards the Black
Passed Pawn, but some are better than others.} 1. Kf3 (1. Kf5 b4 2. Ke5 $2 {
Here White chooses poorly.} b3 3. Kd4 b2 4. Kc3 b1=Q $19) 1... b4 2. Ke2 b3 3.
Kd1 b2 4. Kc2 b1=Q+ 5. Kxb1 $11 *`;

        const chess = new Chess({ pgn });
        expect(chess.setUpFen()).toBe('7k/7P/7P/1p6/6K1/8/8/8 w - - 0 1');
        expect(chess.history()[0].ply).toBe(1);
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
            expect(false).toBeTruthy();
        } catch (e) {
            expect(e).toBeDefined();
        }
        try {
            const chess = new Chess();
            chess.load(fen);
            expect(false).toBeTruthy();
        } catch (e) {
            expect(e).toBeDefined();
        }
    });

    it('should not load random word as FEN', () => {
        try {
            new Chess({ fen: 'win' });
            expect(false).toBeTruthy();
        } catch (e) {
            expect(e).toBeDefined();
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

    it('should load evals mixed with normal comments', () => {
        const chess = new Chess({
            pgn: `{ [%cal Rg4f5] (-5.03 → -2.48) Blunder. Rxh1 was best. [%eval -2.48] (player\'s move was Bf5) } 22. Rdg1  0-1`,
        });
        expect(chess.pgn.gameComment.colorArrows).toEqual(['Rg4f5']);
        expect(chess.pgn.gameComment.eval).toBe(-2.48);
        expect(chess.pgn.gameComment.comment).toBe("(-5.03 → -2.48) Blunder. Rxh1 was best. (player's move was Bf5)");
    });

    it(`should load chess.com let's play header`, () => {
        const chess = new Chess({
            pgn: `[Event "Let\\'s Play!"]
[Site "Chess.com"]
[Date "2026.02.03"]
[Round "?"]
[White "carson2626"]
[Black "JackStenglein"]
[Result "0-1"]
[TimeControl "1/86400"]
[WhiteElo "1150"]
[BlackElo "1650"]
[Termination "JackStenglein won by checkmate"]
[ECO "C70"]
[EndDate "2026.02.05"]
[Link "https://www.chess.com/game/daily/925635819"]

1. e4 {[%clk 2:03:04][%timestamp 73840]} 1... e5`,
        });
        expect(chess.header().getValue('Event')).toBe(`Let's Play!`);
    });

    it(`should load commands with no values`, () => {
        const chess = new Chess({
            pgn: `1. e4 {[%EOG]}`,
        });
        expect(chess.currentMove()?.commentDiag?.EOG).toBe(true);
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

    it('loads PGN with invalid move in mainline, dropping moves after invalid move (https://github.com/jackstenglein/chess-dojo/issues/2205)', () => {
        const pgn =
            '[Event "rated classical game"]\n[Site "https://lichess.org/k4tCL0py"]\n[Date "2026.04.11"]\n[Round "-"]\n[White "LordRook"]\n[Black "scmk6"]\n[Result "1-0"]\n[GameId "k4tCL0py"]\n[UTCDate "2026.04.11"]\n[UTCTime "14:32:55"]\n[WhiteElo "2236"]\n[BlackElo "1928"]\n[WhiteRatingDiff "+20"]\n[BlackRatingDiff "-6"]\n[Variant "Standard"]\n[TimeControl "5400+30"]\n[ECO "D37"]\n[Opening "Queen\'s Gambit Declined: Barmen Variation"]\n[Termination "Normal"]\n[PlyCount "54"]\n\n1. d4 { [%clk 1:30:00] } 1... d5 { [%clk 1:30:00] } 2. c4 { [%cal Gc7c6][%clk 1:30:22] } 2... e6 { [%clk 1:30:20] } 3. Nf3 { [%clk 1:30:44] } 3... Nf6 { [%clk 1:30:37] } 4. Nc3 { [%clk 1:31:12] } 4... Nbd7 { [%clk 1:31:01] } 5. Bf4 { [%clk 1:31:35] } (5. Bg5) 5... Bb4 { [%cal Gf8b4][%csl Gb4][%clk 1:30:53] } 6. cxd5 { [%clk 1:31:57] } 6... Nxd5 { [%clk 1:28:53] } (6... exd5 7. e3 Ne4 8. Qc2 g5 (8... c5 { [%cal Gc7c5,Gd8a5][%csl Gc5] } 9. Bd3 cxd4 10. exd4 Ndf6 (10... O-O) 11. Qa4+ { [%cal Ga4b4][%csl Gb4] }) 9. Be5 f6 (9... Nxe5 10. Nxe5 c6 11. Bd3) 10. Bg3 h5 11. h4 Nxg3 12. fxg3 g4 13. Qg6+) 7. Bd2 { [%cal Ge2e4][%clk 1:32:10] } 7... O-O { [%clk 1:27:53] } (7... N7f6 { [%csl Ge4] } 8. Qc2 { [%cal Ge2e4] } 8... O-O 9. e4 Nxc3 10. bxc3 Be7) 8. e4 { [%clk 1:32:11] } 8... Nxc3 { [%clk 1:27:46] } 9. bxc3 { [%clk 1:32:37] } 9... Be7 { [%clk 1:27:21] } 10. e5 { [%cal Gf1d3,Gd3h7,Gh2h4,Gf3g5][%csl Gh7][%clk 1:28:10] } 10... c5 { [%cal Gd1c2,Gf1d3][%csl Gc2][%clk 1:26:39] } 11. Bd3 { [%clk 1:27:58] } (11. Qc2 cxd4 12. cxd4 b6 13. Bd3) 11... cxd4 { [%cal Gc7c5,Gc5d4][%clk 1:25:29] } 12. cxd4 { [%cal Gd7e5,Gd8d1][%clk 1:27:42] } 12... f6 { I was relieved to see this move, because it gives me the time to solve my perceived tactical problems on the d-file. } { [%clk 1:24:34] } (12... Nxe5 $1 13. dxe5 (13. Nxe5 Qxd4 { [%cal Gd1a1][%csl Ge5,Ga1] } 14. f4 { [%cal Gd4g1] } 14... f6 15. Qh5) (13. Bxh7+ Kxh7 14. dxe5 Qd3 { [%cal Gd3f1] } 15. Qb1 Qxb1+ 16. Rxb1 $15 { [%cal Gb1b7][%csl Gc8,Ge7] }) 13... Qxd3) 13. Qc2 { [%clk 1:22:57] } 13... g6 $2 { I think this is a mistake because it allows for a sacrifice on g6. } { [%csl Gg6][%clk 1:16:18] } 14. Bh6 $1 { [%clk 1:11:41] } (14. Bxg6 hxg6 15. Qxg6+ Kh8 16. Qh6+ Kg8 17. Qg6+) 14... Bb4+ { [%clk 1:03:54] } (14... Qa5+ 15. Kf1 Rd8 16. Bxg6 hxg6 $4 (16... f5 $5 17. Bxf5 $4 (17. Bh5 { SF shows me that this is the way: } 17... Nf8 18. h4 Ng6 19. Bxg6 hxg6 20. Qc1 Kf7 21. h5 gxh5 22. Bg5 $18) 17... exf5 18. Qc4+ Kh8 19. Qf7 $4 Qa6+ { I did not see this when I calculated. I just tucked the king away on g1 and thought I was winning after Ng5. } { [%cal Ga6f1,Ga6h6][%csl Gh6,Gf1] } 20. Kg1 Bf8 (20... Qxh6 21. Qxe7 { Maybe this resolves it, but I didn\'t see it when I calculated. } 21... Qf8 22. Qg5 $19) 21. Ng5 { In my calculations I missed that the h6-bishop was hanging! } { [%cal Ga6h6][%csl Gh6] }) 17. Qxg6+ Kh8 18. Qg7#) 15. Kf1 { [%clk 1:09:38] } 15... Rf7 { [%clk 1:00:40] } 16. Bxg6 { [%cal Gh2h4,Gf1g1,Gg1h2][%csl Gg6,Gh6,Gf3,Gc2,Gb4,Gd7,Gf7,Gd8,Gh1,Ga1][%clk 0:57:10] } 16... Re7 { [%clk 1:00:59] } (16... hxg6 17. Qxg6+ Kh8 18. Qxf7) 17. Be4 { I settle with the fact that I won a pawn and retreat. I don\'t see any combinations to win. } { [%clk 0:50:02] } (17. h4 { SF reveals this as the top move: This was a candidate move of mine, but it was too extreme to me. I didn\'t understand how I could win if I lost the light-squared Bishop. } 17... hxg6 18. Qxg6+ Kh8 19. exf6 Qg8 20. Qxg8+ Kxg8 21. fxe7 Bxe7 $18 { [%cal Gh1h3,Gh3g3] }) 17... Nf8 $6 { [%csl Gc8][%clk 0:48:03] } (17... f5 18. Bxf5 exf5 19. Qc4+ { I was fully prepared for this. } { [%cal Gc4b4] }) (17... fxe5 18. Nxe5 { [%csl Gc5] } (18. dxe5 Nc5 { This is what I was worried about. } { [%cal Gb7b6][%csl Ge4,Gf5,Gg6,Gh7,Gd3] } 19. h4 (19. Bxh7+ Kh8 (19... Rxh7 20. Qg6+ Kh8 { [%cal Gh6g7,Gg6f6][%csl Gg7,Gd8] })) (19. g3 Nxe4 20. Qxe4 b6 { [%cal Gc8b7,Gb7g2,Gf1g2] }) 19... Nxe4 20. Qxe4 { I didn\'t think about the fact that Black has to spend time defending his dark-squared bishop when calculating this line. } { [%cal Ge4b4][%csl Gb4] } 20... b6 (20... Bc5 21. Rh3 { [%csl Gc5] }) 21. Qxa8 $4 { I saw this trap. } (21. Qxb4) 21... Ba6+ $1 22. Kg1 Qxa8 $19) (18. Ng5 exd4 19. Bxh7+ Kh8) 18... Nxe5 19. dxe5 { [%cal Ge4a8] } 19... b6 $13 { White is up 1 pawn, but the pieces are uncoordinated and that will take time to fix. } { [%cal Gc8a6,Ge7h7][%csl Gf1] }) 18. exf6 { [%csl Gf6,Gh6,Ge4,Gc2][%clk 0:42:10] } 18... Rc7 { [%clk 0:48:03] } 19. Qb3 { [%clk 0:35:57] } 19... Ba5 { [%cal Gd8e8,Gb3b5][%csl Gb5][%clk 0:38:48] } (19... Qxf6 20. Bg5 { [%csl Gb4,Gf6] }) (19... Bc3 20. Rc1 Qxf6 21. Bg5 { [%csl Gf6,Gc3] }) (19... Bd6 $1) 20. Qb5 $18 { White is winning now. There are too many threats and tactics. } { [%cal Gb5a5,Gb5g5,Gh6g7,Gf6f7,Gg7f6][%clk 0:27:24] } (20. Bg5 $2 Qe8 { I wanted to avoid this, because I felt that playing 20.Bg5? would have helped Black defend better. }) 20... Ng6 { [%cal Gc7c1,Gb5a5][%clk 0:36:38] } (20... Bb6 21. Qg5+ Kh8 22. Bg7+ Kg8 (22... Rxg7 23. Qxg7#) 23. f7+ Rxf7 24. Bf6+ { [%cal Gg5g8][%csl Gg8] }) (20... Qxf6 21. Bg5) (20... a6 { [%cal Gb5g5][%csl Gg5] } 21. Qg5+ Kh8 22. Bg7+ Kg8 23. f7+ Rxf7 24. Bf6+ Ng6 25. Bxd8) 21. Bg5 { [%cal Gf6f7][%clk 0:22:17] } 21... Kf7 $2 { [%clk 0:34:52] } (21... Rf7 22. Ne5 (22. Bxg6 hxg6 23. Ne5 { [%cal Gc8d7,Gb5b3,Gd7c6] } 23... Bd7 (23... Rxf6 24. Bxf6 Qxf6 25. Qxa5) (23... a6 24. Qa4 b5) 24. Qb3 Rxf6 25. Bxf6 Qxf6 26. Nxd7 Qxd4 27. Rd1) 22... Nxe5 23. Qxe5 (23. dxe5 $16 { [%csl Gf1,Gh1] }) 23... Bc7) (21... a6 22. f7+ (22. Qa4 b5 23. Qb3 { [%cal Ga7a6,Gb7b5][%csl Ga6,Gb5] } 23... Rf7 24. Bxg6 hxg6 25. Ne5 Rf8 (25... Rxf6 26. h3 Rxf2+ 27. Kxf2 Qxg5) 26. f7+ { [%cal Gg5d8] }) 22... Kxf7 23. Bxd8 axb5 24. Bxc7 Bxc7) 22. Bxg6+ { [%clk 0:20:46] } 22... hxg6 { [%clk 0:35:07] } 23. Ne5+ { [%clk 0:21:12] } 23... Kf8 { [%clk 0:35:08] } 24. Nxg6+ { [%clk 0:21:16] } 24... Kf7 { [%clk 0:35:27] } 25. Ne5+ { [%clk 0:21:36] } 25... Kf8 { [%cal Gf8f7,Gf7f8][%clk 0:35:51] } 26. Qd3 $1 { [%cal Gd3g6,Gg5h6][%clk 0:19:49] } 26... Qe8 27. Qg6 (27. Bh6+ Kg8 28. Qg3+ (28. f7+ Rxf7 29. Qg6+ Kh8 30. Nxf7+) 28... Kh8) 27... Qxg6 28. Nxg6+ 27. Bh6+ Kg8 28. Qg3+ (28. f7+ Rxf7 29. Qg6+ Kh8 30. Nxf7+) 28... Kh8 1-0';
        const chess = new Chess({ pgn });
        expect(chess.history()).toHaveLength(55);
        expect(chess.history()[54]?.san).toBe('Nxg6+');
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

describe('forceVariation', () => {
    it(`should load PGN with forced variation`, () => {
        const chess = new Chess({ pgn: `1. e4 (1. e4 e5)` });
        expect(chess.renderPgn()).toBe(`\n1. e4 (1. e4 e5) *`);
    });

    it(`should add forced variation`, () => {
        const chess = new Chess({ pgn: `1. e4 e5 2. d4 exd4` });
        const move = chess.history()[2];
        chess.forceVariation(move);
        expect(chess.history()[2].san).toBe('d4');
        expect(chess.history()[2].variations[0][0]).toBe(move);
        expect(chess.renderPgn()).toBe(`\n1. e4 e5 2. d4 (2. d4 exd4) *`);
    });

    it(`should add forced variation on first move`, () => {
        const chess = new Chess({ pgn: `1. e4 e5 2. d4 exd4` });
        const move = chess.history()[0];
        chess.forceVariation(move);
        expect(chess.history()[0].san).toBe('e4');
        expect(chess.history()[0].variations[0][0]).toBe(move);
        expect(chess.renderPgn()).toBe(`\n1. e4 (1. e4 e5 2. d4 exd4) *`);
    });

    it(`should add forced variation on first move`, () => {
        const chess = new Chess({ pgn: `1. e4 e5 2. d4 exd4` });
        const move = chess.history()[0];
        chess.forceVariation(move);
        expect(chess.history()[0].san).toBe('e4');
        expect(chess.history()[0].variations[0][0]).toBe(move);
        expect(chess.renderPgn()).toBe(`\n1. e4 (1. e4 e5 2. d4 exd4) *`);
    });

    it(`should add forced variation on move with variations`, () => {
        const chess = new Chess({ pgn: `1. e4 (1. d4 d5) e5 2. d4 exd4` });
        const move = chess.history()[0];
        chess.forceVariation(move);
        expect(chess.history()[0].san).toBe('e4');
        expect(chess.history()[0].variations[0][0]).toBe(move);
        expect(chess.renderPgn()).toBe(`\n1. e4 (1. e4 e5 2. d4 exd4) (1. d4 d5) *`);
    });

    it('should move comment when forcing a variation', () => {
        const chess = new Chess({
            pgn: `1. e4 {Here white resigned due to the following line} (1. d4 d5) e5 2. d4 exd4`,
        });
        const move = chess.history()[0];
        chess.forceVariation(move);
        expect(chess.history()[0].san).toBe('e4');
        expect(chess.history()[0].variations[0][0]).toBe(move);
        expect(chess.renderPgn()).toBe(
            `\n1. e4 { Here white resigned due to the following line } (1. e4 e5 2. d4 exd4) (1. d4 d5) *`,
        );
    });

    it('should move comment diag when forcing a variation', () => {
        const chess = new Chess({
            pgn: `1. e4 {[%clk 1:00:00]} (1. d4 d5) e5 2. d4 exd4`,
        });
        const move = chess.history()[0];
        chess.forceVariation(move);
        expect(chess.renderPgn()).toBe(`\n1. e4 { [%clk 1:00:00] } (1. e4 e5 2. d4 exd4) (1. d4 d5) *`);
    });
});

describe('zobrist hashing', () => {
    it('returns stable hash', () => {
        const chess = new Chess();
        const move = chess.move('e4');
        expect(chess.hash(null)).toBe('3436f01fd716346e');
        expect(chess.hash(move)).toBe('7dc436b2c931692c');
    });

    it('returns same hash for transpositions', () => {
        const chess = new Chess();
        chess.move('e4');
        chess.move('e5');
        chess.move('d4');
        const hash = chess.hash();

        chess.seek(null);
        chess.move('d4');
        chess.move('e5');
        chess.move('e4');
        expect(chess.hash()).toBe(hash);
    });
});
