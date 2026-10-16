import pino from "pino";

// Log lines go to /dev/null so we pay the serialization cost but not the terminal.
export const logger = pino(pino.destination({ dest: "/dev/null", sync: false }));
