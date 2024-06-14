# @jackstenglein/chess

@jackstenglein/chess is a TypeScript chess library based on [chess.js](https://github.com/jhlywa/chess.js) and [cm-chess](https://github.com/shaack/cm-chess). It provides PGN/FEN loading; move generation/validation; variations, including reordering and promoting; tracking the current move and seeking through a PGN; PGN header values; NAGs; comments; check/checkmate/stalemate detection; null moves; and more.

This library is used to power the [ChessDojo](https://www.chessdojo.club) annotation editor and tactics tests.

## Installation

Run the following command to install the most recent version from NPM:

```bash
npm install @jackstenglein/chess
```

## Importing

```typescript
import { Chess } from '@jackstenglein/chess';
```

## Example Code

The code below plays a random game of chess:

```typescript
import { Chess } from '@jackstenglein/chess';

const chess = new Chess();

while (!chess.isGameOver()) {
    const moves = chess.moves();
    const move = moves[Math.floor(Math.random() * moves.length)];
    chess.move(move);
}

console.log(chess.renderPgn());
```

Also see the [tests](https://github.com/jackstenglein/chess/tree/main/src/__tests__) for further examples.

## User Interface

This is a headless library and does not include user interface elements. ChessDojo has successfully integrated this library with [Lichess Chessground](https://github.com/lichess-org/chessground).

## Features

It has a similar API to [chess.js](https://github.com/jhlywa/chess.js) and provides much of the same functionality. However, it also offers additional features:

-   Handles variations in addition to the mainline PGN
-   Handles Chessbase-style null moves (Z0)
-   Handles NAGs and comments
-   Keeps track of the "current move" and allows seeking/traversing through the PGN
-   Allows fetching/setting known PGN headers, as well as arbitrary PGN headers
-   Allows fetching/setting known PGN commands, as well as arbitrary PGN commands
-   Allows subscribing to specific events and receiving notifications in a callback
