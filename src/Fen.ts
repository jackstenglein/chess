/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/cm-chess
 * License: MIT, see file 'LICENSE'
 */

export class Fen {
    fen: string = '';
    position: string = '';
    colorToPlay: string = '';
    castlings: string[] = [];
    enPassantTargetSquare: string = '';
    plyClock: number = 0;
    moveNumber: number = 0;

    constructor(fen: string) {
        this.parse(fen);
    }

    /**
     * https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
     * @param fen
     */
    parse(fen: string) {
        const fenParts = fen.split(' ');
        this.position = fenParts[0];
        this.colorToPlay = fenParts[1];
        this.castlings = fenParts[2].split('');
        this.enPassantTargetSquare = fenParts[3];
        this.plyClock = parseInt(fenParts[4], 10);
        this.moveNumber = parseInt(fenParts[5], 10);
    }

    toString() {
        return (
            this.position +
            ' ' +
            this.colorToPlay +
            ' ' +
            this.castlings.join('') +
            ' ' +
            this.enPassantTargetSquare +
            ' ' +
            this.plyClock +
            ' ' +
            this.moveNumber
        );
    }
}
