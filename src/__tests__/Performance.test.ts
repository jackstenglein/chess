import fs from 'fs';
import * as profiler from 'v8-profiler-next';
import { Chess } from '../Chess';

profiler.setGenerateType(1);

function fail(message: any = '') {
    expect(`[FAIL] ${message}`.trim()).toBeFalsy();
}

describe.only('Parsing Performance', () => {
    it('should read massive PGN', () => {
        const data = fs.readFileSync(process.cwd() + '/src/__tests__/data/massive.pgn');

        profiler.startProfiling('massive-pgn', true);
        const start = Date.now();
        new Chess({ pgn: data.toString() });
        const end = Date.now();

        const profile = profiler.stopProfiling('massive-pgn');
        profile.export(function (error, result: any) {
            // if it doesn't have the extension .cpuprofile then
            // chrome's profiler tool won't like it.
            // examine the profile:
            //   Navigate to chrome://inspect
            //   Click Open dedicated DevTools for Node
            //   Select the profiler tab
            //   Load your file
            fs.writeFileSync(`massive-pgn.cpuprofile`, result);
            profile.delete();
        });

        expect(end - start).toBeLessThanOrEqual(500);
    });
});
