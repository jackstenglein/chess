/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn
 * License: MIT, see file 'LICENSE'
 */
import { Header, TAGS } from '../Header';

test('Parse Header', () => {
    const header = new Header(`[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]`);

    expect(Object.keys(header.tags).length).toBe(7);
    expect(header.tags[TAGS.Event]).toBe('F/S Return Match');
});

test('Parse and Render Header', () => {
    const content = `[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]
`;

    const header = new Header(content);
    expect(header.render()).toBe(content);
});
