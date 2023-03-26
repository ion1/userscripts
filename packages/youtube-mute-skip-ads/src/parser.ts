export function parse(value: unknown): Parser<unknown> {
  return new Parser<unknown>([], value);
}

export class ParserError extends Error {
  constructor(msg: string) {
    super(msg);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class Parser<T> {
  path: string[];
  value: T;

  constructor(path: string[], value: T) {
    this.path = [...path];
    this.value = value;
  }

  pathString(): string {
    return this.path.join(" → ");
  }

  boolean(this: Parser<unknown>): Parser<boolean> {
    if (!(this.value != null && typeof this.value === "boolean")) {
      throw new ParserError(
        `${this.pathString()}: Expected boolean: ${this.value}`
      );
    }

    return new Parser([...this.path, "boolean"], this.value);
  }

  number(this: Parser<unknown>): Parser<number> {
    if (!(this.value != null && typeof this.value === "number")) {
      throw new ParserError(
        `${this.pathString()}: Expected number: ${this.value}`
      );
    }

    return new Parser([...this.path, "number"], this.value);
  }

  object(this: Parser<unknown>): Parser<object> {
    if (!(this.value != null && typeof this.value === "object")) {
      throw new ParserError(
        `${this.pathString()}: Expected object: ${this.value}`
      );
    }

    return new Parser([...this.path, "object"], this.value);
  }

  function(this: Parser<unknown>): Parser<Function> {
    if (!(this.value != null && typeof this.value === "function")) {
      throw new ParserError(
        `${this.pathString()}: Expected function: ${this.value}`
      );
    }

    return new Parser([...this.path, "function"], this.value);
  }

  property(this: Parser<object>, name: string): Parser<unknown> {
    if (!(name in this.value)) {
      throw new ParserError(
        `${this.pathString()}: Expected property ${JSON.stringify(name)}: ${
          this.value
        }`
      );
    }

    const prop = this.value[name as keyof typeof this.value] as unknown;

    return new Parser([...this.path, `property ${JSON.stringify(name)}`], prop);
  }

  method(this: Parser<object>, name: string): Parser<Function> {
    const func = this.property(name).function().value;

    const boundFunc = func.bind(this.value) as Function;

    return new Parser(
      [...this.path, `method ${JSON.stringify(name)}`],
      boundFunc
    );
  }

  call(this: Parser<Function>, ...args: unknown[]): Parser<unknown> {
    const result = this.value(args) as unknown;

    return new Parser([...this.path, "call"], result);
  }
}
