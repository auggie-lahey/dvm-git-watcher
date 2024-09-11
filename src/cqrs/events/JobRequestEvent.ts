import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent, NSet} from '@nostrify/nostrify';
import {getParams, getTag} from "../../utils/nostrEventUtils.ts";
import {resolveCommandHandler, resolveEventHandler} from "../base/cqrs.ts";
import {RepoWatchRequestedEvent} from "./RepoWatchRequestedEvent.ts";
import { Address } from '@welshman/util';
import ICommandHandler from "../base/ICommandHandler.ts";
import {WatchRepositoryCommand} from "../commands/WatchRepositoryCommand.ts";

export class JobRequestEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class JobRequestEventHandler implements IEventHandler<JobRequestEvent> {

    private events: NSet;
    private watchRepositoryCommandHandler: ICommandHandler<WatchRepositoryCommand>

    constructor(
        @inject("Logger") private logger: pino.Logger,
    ) {
        this.events = new NSet()
        this.watchRepositoryCommandHandler = resolveCommandHandler(WatchRepositoryCommand.name)
    }

    async execute(event: JobRequestEvent): Promise<void> {
        this.logger.info(`Handling job request event ${event.nostrEvent.id}`)

        // Deduplicate events
        if (this.events.has(event.nostrEvent)) {
            return;
        }
        this.events.add(event.nostrEvent);

        console.log(event.nostrEvent);

        // TODO: validation
        const params = getParams(event.nostrEvent);

        if (params.get("duration_millis") === undefined) {
            console.log("missing parameter duration_millis");
            return;
        }

        console.log(params);

        const watchUntil = Number( params.get("duration_millis")); // TODO: Change to watch_untill
        const iTag = getTag(event.nostrEvent, "i");
        const repoAddress = Address.fromNaddr(iTag[1]);


        const repoWatchRequestedEventHandler = resolveEventHandler(RepoWatchRequestedEvent.name)
        await repoWatchRequestedEventHandler.execute({nostrEvent: event})

        await this.watchRepositoryCommandHandler.execute({repoAddress: repoAddress, watchUntil: watchUntil})
    }
}