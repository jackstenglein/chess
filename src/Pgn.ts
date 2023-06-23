/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-pgn
 * License: MIT, see file 'LICENSE'
 */
import { parse, ParseTree } from '@mliebelt/pgn-parser';
import { PgnMove } from '@mliebelt/pgn-types';

import { Header, TAGS } from './Header';
import { History } from './History';

interface PgnProps {
    sloppy?: boolean;
}

export class Pgn {
    header: Header;
    history: History;
    gameComment: string;

    constructor(pgnString = '', props: PgnProps = {}) {
        this.gameComment = '';

        const lastHeaderElement =
            pgnString.trim().slice(-1) === ']' ? pgnString.length : pgnString.lastIndexOf(']\n\n') + 1;
        const headerString = pgnString.substring(0, lastHeaderElement);
        this.header = new Header(headerString);

        let moves: PgnMove[] = [];
        const moveText = pgnString.substring(lastHeaderElement);
        if (moveText.trim().length > 0) {
            const parseTree = parse(pgnString.replace(/\s\s+/g, ' ').replace(/\n/g, ' '), {
                startRule: 'game',
            }) as ParseTree;
            console.log(JSON.stringify(parseTree, null, 2));

            moves = parseTree.moves;
            if (parseTree.gameComment && parseTree.gameComment.comment) {
                this.gameComment = parseTree.gameComment.comment;
            }
        }

        this.history = new History(moves, this.header.tags[TAGS.FEN], props.sloppy);
    }

    wrap(str: string, maxLength: number) {
        const words = str.split(' ');
        let lines: string[] = [];
        let line = '';
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (maxLength <= 0 || line.length + word.length < maxLength) {
                line += word + ' ';
            } else {
                lines.push(line.trim());
                line = word + ' ';
            }
        }
        lines.push(line.trim());
        return lines.join('\n');
    }

    render(width = -1, renderHeader = true, renderComments = true, renderNags = true) {
        let result = renderHeader ? this.header.render() + '\n' : '';

        if (renderComments && this.gameComment) {
            result += `{${this.gameComment}}\n`;
        }

        let history = this.history.render(renderComments, renderNags);
        if (this.header.tags[TAGS.Result]) {
            history += ' ' + this.header.tags[TAGS.Result];
        }
        return result + this.wrap(history, width);
    }
}
