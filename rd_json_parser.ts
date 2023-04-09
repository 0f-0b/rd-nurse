// Modified version of https://gist.github.com/darktable/1411710
class StringReader {
  readonly #str: string;
  #pos = 0;

  constructor(str: string) {
    this.#str = `${str}`;
  }

  peek(): string {
    return this.#str.charAt(this.#pos);
  }

  read(): string {
    return this.#str.charAt(this.#pos++);
  }
}

const Token = Object.freeze({
  LeftBrace: 0,
  RightBrace: 1,
  LeftBracket: 2,
  RightBracket: 3,
  Colon: 4,
  Comma: 5,
  String: 6,
  Number: 7,
  True: 8,
  False: 9,
  Null: 10,
  Unknown: 11,
});
type Token = number;
const whitespace = new Set("\t\n\r ");
const wordBreak = new Set([...whitespace, ...'{}[]:,"', ""]);

function parseLong(str: string): bigint {
  try {
    const value = BigInt(str);
    return BigInt.asIntN(64, value) === value ? value : 0n;
  } catch {
    return 0n;
  }
}

function parseDouble(str: string): number {
  const value = Number(str);
  return Number.isNaN(value) ? 0 : value;
}

class RDJsonParser {
  readonly #reader: StringReader;

  constructor(text: string) {
    this.#reader = new StringReader(text);
  }

  #skipWhitespace(): undefined {
    for (;;) {
      const c = this.#reader.peek();
      if (!whitespace.has(c)) {
        break;
      }
      this.#reader.read();
    }
    return;
  }

  #getWord(): string {
    let word = "";
    for (;;) {
      const c = this.#reader.peek();
      if (wordBreak.has(c)) {
        break;
      }
      word += this.#reader.read();
    }
    return word;
  }

  #getToken(): Token | undefined {
    this.#skipWhitespace();
    switch (this.#reader.peek()) {
      case "":
        return undefined;
      case "{":
        return Token.LeftBrace;
      case "}":
        this.#reader.read();
        return Token.RightBrace;
      case "[":
        return Token.LeftBracket;
      case "]":
        this.#reader.read();
        return Token.RightBracket;
      case ":":
        return Token.Colon;
      case ",":
        this.#reader.read();
        return Token.Comma;
      case '"':
        return Token.String;
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
      case "-":
        return Token.Number;
      default:
        switch (this.#getWord()) {
          case "false":
            return Token.False;
          case "true":
            return Token.True;
          case "null":
            return Token.Null;
          default:
            return Token.Unknown;
        }
    }
  }

  parseValue(): unknown {
    return this.#parseByToken(this.#getToken());
  }

  #parseByToken(token: Token | undefined): unknown {
    switch (token) {
      case Token.LeftBrace:
        return this.parseObject();
      case Token.LeftBracket:
        return this.parseArray();
      case Token.String:
        return this.parseString();
      case Token.Number:
        return this.parseNumber();
      case Token.True:
        return true;
      case Token.False:
        return false;
      default:
        return null;
    }
  }

  parseObject(): Record<string, unknown> | null {
    const value: Record<string, unknown> = Object.create(null);
    this.#reader.read();
    parse:
    for (;;) {
      switch (this.#getToken()) {
        case undefined:
        case Token.Unknown:
          return null;
        case Token.RightBrace:
          break parse;
        case Token.Comma:
          continue;
      }
      const key = this.parseString();
      switch (this.#getToken()) {
        case Token.Colon:
          this.#reader.read();
          break;
        default:
          return null;
      }
      value[key] = this.parseValue();
    }
    return value;
  }

  parseArray(): unknown[] | null {
    this.#reader.read();
    const value: unknown[] = [];
    parse:
    for (;;) {
      const token = this.#getToken();
      switch (token) {
        case undefined:
        case Token.Unknown:
          return null;
        case Token.RightBracket:
          break parse;
        case Token.Colon:
          this.#reader.read();
          continue;
        case Token.Comma:
          continue;
      }
      value.push(this.#parseByToken(token));
    }
    return value;
  }

  parseString(): string {
    this.#reader.read();
    let value = "";
    parse:
    for (;;) {
      const c = this.#reader.read();
      switch (c) {
        case "":
        case '"':
          break parse;
        case "\\": {
          const c = this.#reader.read();
          switch (c) {
            case "":
              break parse;
            case '"':
            case "/":
            case "\\":
              value += c;
              break;
            case "b":
              value += "\b";
              break;
            case "f":
              value += "\f";
              break;
            case "n":
              value += "\n";
              break;
            case "r":
              value += "\r";
              break;
            case "t":
              value += "\t";
              break;
            case "u": {
              let code = "0x0";
              for (let i = 0; i < 4; i++) {
                code += this.#reader.read();
              }
              value += String.fromCharCode(Number(code));
              break;
            }
          }
          break;
        }
        default:
          value += c;
          break;
      }
    }
    return value;
  }

  parseNumber(): number {
    const word = this.#getWord();
    return word.includes(".") ? parseDouble(word) : Number(parseLong(word));
  }
}

export function parseRDJson(text: string): unknown {
  const parser = new RDJsonParser(text);
  return parser.parseValue();
}
