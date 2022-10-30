import { bold, red } from "https://deno.land/x/cliffy@v0.25.4/command/deps.ts";
import {
  Command,
  ValidationError,
} from "https://deno.land/x/cliffy@v0.25.4/command/mod.ts";

export * from "https://deno.land/x/cliffy@v0.25.4/command/mod.ts";
Object.defineProperty(Command.prototype, "error", {
  value: {
    error(this: Command, e: Error): never {
      if (this.shouldThrowErrors() || !(e instanceof ValidationError)) {
        throw e;
      }
      this.showHelp();
      console.error(`${bold(red("error"))}: ${e.message}`);
      Deno.exit(2);
    },
  }.error,
});
