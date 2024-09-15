import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';
import {getParams, getTag} from "../../utils/nostrEventUtils.ts";
import {resolveCommandHandler, resolveEventHandler} from "../base/cqrs.ts";
import { Address } from '@welshman/util';
import {WatchRepositoryCommand} from "../commands/WatchRepositoryCommand.ts";
import ICommandHandler from "../base/ICommandHandler.ts";

export class RepoWatchRequestedEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class RepoWatchRequestedEventHandler implements IEventHandler<RepoWatchRequestedEvent> {
    private watchRepositoryCommandHandler: ICommandHandler<WatchRepositoryCommand>

    constructor(@inject("Logger") private logger: pino.Logger) {
        this.watchRepositoryCommandHandler = resolveCommandHandler(WatchRepositoryCommand.name)
    }

    async execute(event: RepoWatchRequestedEvent): Promise<void> {
        // TODO: validation
        const params = getParams(event.nostrEvent);

        if (params.get("watch_untill") === undefined) {
            console.log("missing parameter watch_untill");
            return;
        }

        try {
            const iTag = getTag(event.nostrEvent, "i");
            const repoAddress = Address.fromNaddr(iTag[1]);
            const watchUntil = Number( params.get("watch_untill"));

            await this.watchRepositoryCommandHandler.execute({repoAddress: repoAddress, watchUntil: watchUntil})
        } catch (e){
            this.logger.error("error when trying to start watch.", e)
        }

    }
}