/**
 * Author and copyright: Stefan Haack (https://shaack.com), JackStenglein
 * Repository: https://github.com/jackstenglein/chess
 * License: MIT, see file 'LICENSE'
 */
import { parse, DiagramComment, split, StartRule } from '@jackstenglein/pgn-parser';
import { Header } from './Header';
import { History, HistoryRenderOptions } from './History';
import { FEN } from './Chess';

export interface RenderOptions extends HistoryRenderOptions {
    /**
     * Whether to limit the line length to a certain width. If undefined
     * or <= 0, there will be no maximum line width.
     */
    width?: number;

    /** Whether to skip rendering the header. */
    skipHeader?: boolean;
}

export class Pgn<UserData> {
    header: Header;
    history: History<UserData>;
    gameComment: DiagramComment;

    /**
     * Constructs a new Pgn object with the given options.
     * @param pgn The PGN to parse. Defaults to empty string.
     * @param fen The FEN to start from if not found in the PGN. Defaults to starting position.
     * @param strict Whether to use the strict SAN parser. Defaults to false.
     */
    constructor({ pgn = '', fen = FEN.start, strict = false }: { pgn?: string; fen?: string; strict?: boolean } = {}) {
        this.gameComment = {};

        if (!pgn) {
            this.header = new Header({ tags: {} });
            if (fen !== FEN.start) {
                this.header.tags.FEN = fen;
                this.header.tags.SetUp = '1';
            }
            this.history = new History([], this.header.tags.FEN || fen);
            return;
        }

        let startRule: StartRule = 'game';
        const games = split(pgn);
        if (games.length < 1 || games[0].pgn.trim().length === 0) {
            startRule = 'tags';
        }

        const parseTree = parse(pgn, { startRule });
        // console.log(JSON.stringify(parseTree, null, 2));

        if (parseTree.gameComment) {
            this.gameComment = parseTree.gameComment;
        }

        this.header = new Header({ tags: parseTree.tags });
        if (fen !== FEN.start) {
            this.header.tags.SetUp = '1';
            this.header.tags.FEN = fen;
        }

        this.history = new History(parseTree.moves, this.header.tags.FEN || fen, strict);
    }

    /**
     * Returns the PGN as a string, using the provided options.
     * @param options An object that controls which fields are included in the output.
     * @returns The PGN as a string.
     */
    render({ width = -1, skipHeader, skipComments, skipVariations, skipNags }: RenderOptions = {}) {
        let result = !skipHeader ? this.header.render() + '\n' : '';

        if (!skipComments && this.gameComment.comment) {
            result += `{ ${this.gameComment.comment} }\n`;
        }

        let history = this.history.render({ skipComments, skipVariations, skipNags });
        if (this.header.tags.Result) {
            history += ' ' + this.header.tags.Result;
        }
        return result + wrap(history, width);
    }
}

/**
 * Trims whitespace and word wraps the given string at the given max length.
 * If maxLength <= 0, the string is not word wrapped, but does have white space
 * trimmed.
 * @param str The string to wrap.
 * @param maxLength The max length of each line.
 * @returns The string with leading/trailing whitespace trimmed and wrapped to the line length.
 */
function wrap(str: string, maxLength: number): string {
    if (maxLength <= 0) {
        return str.trim();
    }

    const words = str.split(' ');
    let lines: string[] = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (line.length + word.length < maxLength) {
            line += word + ' ';
        } else {
            lines.push(line.trim());
            line = word + ' ';
        }
    }
    lines.push(line.trim());
    return lines.join('\n');
}
