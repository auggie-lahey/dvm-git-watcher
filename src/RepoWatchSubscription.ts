import {
    NostrEvent
} from "@nostrify/nostrify";

export class RepoWatchSubscription {
    repoAddress!: string;
    branchNames!: string[];
    watchUntil!: number;
    latestStateAnnouncement?: NostrEvent;
}
