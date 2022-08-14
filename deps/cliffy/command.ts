import {
  Command,
  ValidationError,
} from "https://deno.land/x/cliffy@v0.24.3/command/mod.ts";
import { bold, red } from "../std/fmt/colors.ts";

export * from "https://deno.land/x/cliffy@v0.24.3/command/mod.ts";
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
