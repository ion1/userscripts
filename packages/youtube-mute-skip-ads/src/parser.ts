export function parse(value: unknown): Parser<unknown> {
  return new Parser<unknown>([], value);
}

export function optional<T>(func: () => T): T | null {
  try {
    return func();
  } catch (e) {
    if (!(e instanceof ParserError)) {
      throw e;
    }

    return null;
  }
}

export class ParserError extends Error {
  constructor(msg: string) {
    super(msg);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type UnknownFunction = (...args: unknown[]) => unknown;

// Note: the methods with a restriction on the type of "this" do not check the invariant
// in runtime, only use this from TypeScript.

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

  function(this: Parser<unknown>): Parser<UnknownFunction> {
    if (!(this.value != null && typeof this.value === "function")) {
      throw new ParserError(
        `${this.pathString()}: Expected function: ${this.value}`
      );
    }

    const func = this.value as UnknownFunction;

    return new Parser([...this.path, "function"], func);
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

  method(this: Parser<object>, name: string): Parser<UnknownFunction> {
    const func = this.property(name).function().value;

    const boundFunc = func.bind(this.value) as UnknownFunction;

    return new Parser(
      [...this.path, `method ${JSON.stringify(name)}`],
      boundFunc
    );
  }

  call(this: Parser<UnknownFunction>, ...args: unknown[]): Parser<unknown> {
    const result = this.value(...args);

    return new Parser([...this.path, "call"], result);
  }
}
