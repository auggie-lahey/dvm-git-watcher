import IJobRequestRoutingService from './IJobRequestRoutingService.ts';
import {NostrEvent} from "@nostrify/nostrify";
import {resolveEventHandler} from "./cqrs/base/cqrs.ts";
import {RepoWatchRequestedEvent} from "./cqrs/events/RepoWatchRequestedEvent.ts";
import IEventHandler from "./cqrs/base/IEventHandler.ts";

export class JobRequestRoutingService implements IJobRequestRoutingService {
    private repoWatchRequestedEventHanlder: IEventHandler<RepoWatchRequestedEvent>;

    constructor() {
        this.repoWatchRequestedEventHanlder = resolveEventHandler(RepoWatchRequestedEvent.name)
    }

    async route(jobType: string, event: NostrEvent): Promise<void> {

        switch (jobType) {
            case "git-proposal-commit-watch":
                await this.repoWatchRequestedEventHanlder.execute({nostrEvent: event})
                break;
            default: throw Error("Cannot route unrecognized jobType")
        }
    }
}
