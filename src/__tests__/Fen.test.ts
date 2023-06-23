import { Fen } from '../Fen';

describe('Fen', function () {
    it('should parse and generate a FEN', () => {
        const fenString =
            'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
        const fen = new Fen(fenString);
        expect(fen.position).toBe('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R');
        expect(fen.colorToPlay).toBe('b');
        expect(fen.castlings.length).toBe(4);
        expect(fen.enPassantTargetSquare).toBe('-');
        expect(fen.plyClock).toBe(1);
        expect(fen.moveNumber).toBe(2);
        expect(fen.toString()).toBe(fenString);
    });
});
