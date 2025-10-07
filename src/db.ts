import Dexie, { Table } from "dexie";
import type { Identity, LibraryItem, Account, Member } from "./types";

export class GameDB extends Dexie {
  identities!: Table<Identity, string>;
  library!: Table<LibraryItem, string>;
  accounts!: Table<Account, string>;
  members!: Table<Member, string>;

  constructor() {
    super("game-tracker-db");
    this.version(1).stores({
      identities: "id, title, platform",
      library: "id, identityId, status, memberId, accountId",
      accounts: "id, platform",
      members: "id"
    });
    // Future migrations example:
    this.version(2).stores({
      identities: "id, title, platform, openCriticId, igdbId",
      library: "id, identityId, status, memberId, accountId, acquiredAt"
    }).upgrade(async (_tx) => {
      // put migration logic if necessary
    });
  }
}

export const db = new GameDB();
