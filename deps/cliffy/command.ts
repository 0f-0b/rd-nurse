import { bold, red } from "https://deno.land/x/cliffy@v0.25.7/command/deps.ts";
import {
  Command,
  ValidationError,
} from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";

export * from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
Object.defineProperty(Command.prototype, "throw", {
  value: {
    throw(this: Command, error: Error): never {
      if (error instanceof ValidationError) {
        error.cmd = this;
      }
      this["getErrorHandler"]()?.(error, this);
      if (!(error instanceof ValidationError) || this.shouldThrowErrors()) {
        throw error;
      }
      this.showHelp();
      console.error(`${bold(red("error"))}: ${error.message}`);
      Deno.exit(2);
    },
  }.throw,
});
