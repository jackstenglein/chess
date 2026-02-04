import fs from 'fs';
import { Chess } from '../Chess';

describe.only('Parsing Performance', () => {
    it('should read massive PGN', () => {
        const data = fs.readFileSync(process.cwd() + '/src/__tests__/data/massive.pgn');

        const start = Date.now();
        new Chess({ pgn: data.toString() });
        const end = Date.now();

        expect(end - start).toBeLessThanOrEqual(750);
    });
});
