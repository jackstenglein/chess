/**
 * Author and copyright: Stefan Haack (https://shaack.com), Jack Stenglein
 * Repository: https://github.com/jackstenglein/chess
 * License: MIT, see file 'LICENSE'
 */

import { parse, Tags, SevenTagRoster } from '@jackstenglein/pgn-parser';

export { Tags, SevenTagRoster } from '@jackstenglein/pgn-parser';

/**
 * Contains PGN header information.
 */
export class Header {
    tags: Tags = {};

    /**
     * Constructs a new Header, either using an already parsed set of Tags or
     * by parsing a PGN string.
     * @param props The already-parsed Tags or the PGN string to parse. If both are provided, tags takes precedence.
     * If neither are provided, the header will be initialized with an empty set of tags.
     */
    constructor({ tags, pgn }: { tags?: Tags; pgn?: string }) {
        if (tags) {
            this.tags = tags;
        } else if (pgn) {
            this.initFromString(pgn);
        }
    }

    /**
     * Initializes the Header by parsing a PGN header string.
     * @param pgn The PGN string to parse.
     */
    initFromString(pgn = '') {
        this.tags = parse(pgn, { startRule: 'tags' }).tags || {};
    }

    /**
     * Removes all tags from this Header.
     */
    clear() {
        this.tags = {};
    }

    /**
     * Returns the raw value of the tag, as it is encoded in the PGN header.
     * If the tag is not present, an empty string is returned.
     * @param name The name of the tag to fetch.
     * @returns The raw value of the tag, or an empty string if not present.
     */
    getRawValue(name: string): string {
        const tag = this.tags[name];
        if (!tag) {
            return '';
        }

        if (typeof tag === 'string') {
            return tag;
        }

        return tag.value ?? '';
    }

    /**
     * Returns the value of the tag, as returned by the PGN parser library.
     * If you want the raw string value, use getRawValue instead.
     * @param name The name of the tag to fetch.
     * @returns The value of the tag, as returned by the PGN parser.
     */
    getValue(name: string) {
        return this.tags[name];
    }

    /**
     * Sets the value of the given tag, first parsing it with the PGN parser library.
     * This allows passing a complex tag like [TimeControl "40/1200"] as setValue("TimeControl", "40/1200")
     * and then receiving { value: "40/1200", moves: 40, seconds: 1200 } in response to getValue("TimeControl").
     * If the provided value is undefined or empty, then the tag is removed.
     * @param name The name of the tag to update.
     * @param value The value to set it to.
     */
    setValue(name: string, value?: string) {
        if (!value) {
            delete this.tags[name];
        } else {
            const newTags = parse(`[${name} "${value}"]`, { startRule: 'tags' }).tags || {};
            this.tags = {
                ...this.tags,
                ...newTags,
            };
        }
    }

    /**
     * Returns the tags as a PGN header string. If present, the seven tag roster
     * always appears first, in the order specified by the PGN standard.
     * @returns The tags as a PGN header string.
     */
    render() {
        let rendered = '';

        for (const tag of SevenTagRoster) {
            const value = this.getRawValue(tag);
            if (value) {
                rendered += `[${tag} "${value}"]\n`;
            }
        }

        for (const tag in this.tags) {
            if (!SevenTagRoster.includes(tag)) {
                rendered += `[${tag} "${this.getRawValue(tag)}"]\n`;
            }
        }

        return rendered;
    }

    /**
     * @returns The headers as a record from the header name to the raw value.
     */
    valueMap(): Record<string, string> {
        const result: Record<string, string> = {};
        for (const tag in this.tags) {
            result[tag] = this.getRawValue(tag);
        }
        return result;
    }
}
