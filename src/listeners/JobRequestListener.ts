import {inject, injectable} from "tsyringe";
import type pino from "pino";
import IEventListener from './IEventListener.ts';
import {JobRequestEvent} from '../cqrs/events/JobRequestEvent.ts';
import {RelayProvider} from '../RelayProvider.ts';
import type IRelayProvider from "../IRelayProvider.ts";
import {resolveEventHandler} from "../cqrs/base/cqrs.ts";
import IEventHandler from "../cqrs/base/IEventHandler.ts";
import {NRelay} from '@nostrify/nostrify';
import {nostrNow} from "../utils/nostrEventUtils.ts";

@injectable()
export class JobRequestListener implements IEventListener {

    private logger: pino.Logger;
    private jobRequestEventHandler: IEventHandler<JobRequestEvent>;
    private relay: NRelay;

    constructor(
        @inject("Logger") logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.logger = logger;
        this.jobRequestEventHandler = resolveEventHandler(JobRequestEvent.name);
        this.relay = relayProvider.getDefaultPool();
    }

    public async run(): Promise<void> {

        // Now you can use the pool like a regular relay.
        var filters = [
            {
                kinds: [68001],
                "#j": ["git-proposal-commit-watch"],
                limit: 1000,
                since: nostrNow() - 10000
            }
        ]

        for await (const msg of this.relay.req(filters, {})) {
            console.log(msg[2])
            if (msg[0] === 'EVENT') {
                await this.jobRequestEventHandler.execute({nostrEvent: msg[2]})
            }
            if (msg[0] === 'EOSE') {
                console.log("end of stream")
            }
        }
    }
}