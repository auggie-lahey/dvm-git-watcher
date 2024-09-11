import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';

export class RepoWatchRequestedEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class RepoWatchRequestedEventHandler implements IEventHandler<RepoWatchRequestedEvent> {

    constructor(@inject("Logger") private logger: pino.Logger) {

    }

    async execute(event: RepoWatchRequestedEvent): Promise<void> {
        this.logger.info(`Handling Nostr event ${event.nostrEvent.id} received.`)
    }
}