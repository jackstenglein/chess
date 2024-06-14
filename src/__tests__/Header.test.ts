/**
 * Author and copyright: Stefan Haack (https://shaack.com), Jack Stenglein
 * Repository: https://github.com/shaack/cm-pgn
 * License: MIT, see file 'LICENSE'
 */
import { TimeControlKind } from '@jackstenglein/pgn-parser';
import { Header } from '../Header';

describe('Header', () => {
    it('should parse from PGN string', () => {
        const header = new Header({
            pgn: `[Event "F/S Return Match"]
                [Site "Belgrade, Serbia JUG"]
                [Date "1992.11.04"]
                [Round "29"]
                [White "Fischer, Robert J."]
                [Black "Spassky, Boris V."]
                [Result "1/2-1/2"]`,
        });

        expect(Object.keys(header.tags).length).toBe(7);
        expect(header.tags.Event).toBe('F/S Return Match');
        expect(header.tags.Site).toBe('Belgrade, Serbia JUG');
        expect(header.tags.Date?.value).toBe('1992.11.04');
        expect(header.tags.Round).toBe('29');
        expect(header.tags.White).toBe('Fischer, Robert J.');
        expect(header.tags.Result).toBe('1/2-1/2');
    });

    it('should render seven-tag roster in order', () => {
        const content = `[Foo "Test"]
            [Site "Belgrade, Serbia JUG"]
            [Event "F/S Return Match"]
            [Round "29"]
            [White "Fischer, Robert J."]
            [Date "1992.11.04"]
            [Black "Spassky, Boris V."]
            [Result "1/2-1/2"]`;

        const header = new Header({ pgn: content });
        expect(header.render()).toBe(`[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]
[Foo "Test"]
`);
    });

    it('should read dates as complex values', () => {
        const header = new Header({ pgn: '[Date "1992.11.04"]' });
        expect(header.tags.Date).toEqual({ value: '1992.11.04', year: 1992, month: 11, day: 4 });
    });

    it('should read ELO as a complex value', () => {
        const header = new Header({ pgn: `[WhiteElo "1500 USCF"]` });
        expect(header.tags.WhiteElo).toEqual({ value: '1500 USCF', int: 1500 });
    });

    it('should read known and custom headers', () => {
        const header = new Header({
            pgn: `[White "Fischer"]
                [Foo "Test"]`,
        });
        expect(header.tags.White).toBe('Fischer');
        expect(header.tags.Foo).toBe('Test');
    });

    it('should read time control as complex value', () => {
        const header = new Header({ pgn: `[TimeControl "40/3600:20/1800+30:900"]` });
        expect(header.tags.TimeControl).toEqual({
            value: '40/3600:20/1800+30:900',
            items: [
                { kind: TimeControlKind.MovesInSeconds, moves: 40, seconds: 3600, value: '40/3600' },
                {
                    kind: TimeControlKind.MovesInSecondsWithIncrement,
                    moves: 20,
                    seconds: 1800,
                    increment: 30,
                    value: '20/1800+30',
                },
                { kind: TimeControlKind.SuddenDeath, seconds: 900, value: '900' },
            ],
        });
    });
});
