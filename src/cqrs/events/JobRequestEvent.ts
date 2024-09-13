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
import {JobRequestRoutingService} from "../../JobRequestRoutingService.ts";
import type IJobRequestRoutingService from "../../IJobRequestRoutingService.ts";

export class JobRequestEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class JobRequestEventHandler implements IEventHandler<JobRequestEvent> {

    private events: NSet;
    private supportedJobTypes = [
        "git-proposal-commit-watch"
    ]

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(JobRequestRoutingService.name) private jobRequestRoutingService: IJobRequestRoutingService,
    ) {
        this.events = new NSet()
    }

    async execute(event: JobRequestEvent): Promise<void> {

        // Deduplicate events
        if (this.events.has(event.nostrEvent)) {
            return;
        }
        this.events.add(event.nostrEvent);

        this.logger.info(`Handling job request event ${event.nostrEvent.id}`)
        // console.log(event.nostrEvent);

        const jobType = getTag(event.nostrEvent, "j")[1];

        if(!this.supportedJobTypes.includes(jobType)){
            console.log(`JobType ${jobType} is not supported by this DVM.`)
            return;
        }

        await this.jobRequestRoutingService.route(jobType, event.nostrEvent)
    }
}