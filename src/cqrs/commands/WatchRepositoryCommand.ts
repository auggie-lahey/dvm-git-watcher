import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay} from '@nostrify/nostrify';
import { Address } from '@welshman/util';
import {resolveCommandHandler, resolveEventHandler} from "../base/cqrs.ts";
import {PublishTextNoteCommand} from "./PublishTextNoteCommand.ts";
import IEventHandler from "../base/IEventHandler.ts";
import {GitPatchEvent} from "../events/GitPatchEvent.ts";
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import { GitStateAnnouncementEvent } from '../events/GitStateAnnouncementEvent.ts';
import {NSet} from "@nostrify/nostrify";

export class WatchRepositoryCommand implements ICommand {
    repoAddress!: Address
    watchUntil!: number
}

@injectable()
export class WatchRepositoryCommandHandler implements ICommandHandler<WatchRepositoryCommand> {

    private relay: NRelay;
    private logger: pino.Logger;
    private events: NSet;
    private publishTextNoteCommandHandler: ICommandHandler<PublishTextNoteCommand>
    private gitPatchEventHandler: IEventHandler<GitPatchEvent>
    private gitStateAnnouncementEventHandler: IEventHandler<GitStateAnnouncementEvent>

    constructor(
        @inject("Logger") logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.logger = logger;
        this.relay = relayProvider.getDefaultPool();
        this.publishTextNoteCommandHandler = resolveCommandHandler(PublishTextNoteCommand.name)
        this.gitPatchEventHandler = resolveEventHandler(GitPatchEvent.name)
        this.gitStateAnnouncementEventHandler = resolveEventHandler(GitStateAnnouncementEvent.name)

        this.events = new NSet()
    }

    async execute(command: WatchRepositoryCommand): Promise<void> {
        // broadcast
        this.publishTextNoteCommandHandler.execute({message: `I started watching the following repository until ${command.watchUntil}. nostr:${command.repoAddress.toNaddr()} `})
        console.log(`Started listening to repo: ${command.repoAddress}`)

        // subscribe to events for repository
        const repoKind = command.repoAddress.kind;
        const repoOwnerPubkey = command.repoAddress.pubkey;
        const repoIdentifier = command.repoAddress.identifier;

        var patchFilters = [
            {
                kinds: [1617], // 1617 = Patches, 30618 = State announcement
                "#a": [`${repoKind}:${repoOwnerPubkey}:${repoIdentifier}`],
                limit: 50,
                since: nostrNow(),
            },
            {
                kinds: [30618], // 30618 = State announcement
                authors: [repoOwnerPubkey],
                "#d": [repoIdentifier],
                limit: 50,
                since: nostrNow(),
            }
        ]

        // Listen for repo events until watchDurationMs is over
        for await (const evnt of this.relay.req(patchFilters, {})) {
            if (evnt[0] === 'EVENT') {
                console.log(evnt[2])
                // Deduplicate events
                if (this.events.has(evnt[2])) {
                    return;
                }
                this.events.add(evnt[2]);

                if(evnt[2].kind == 1617){
                    await this.gitPatchEventHandler.execute({nostrEvent: evnt[2]})
                } else{
                    await this.gitStateAnnouncementEventHandler.execute({nostrEvent: evnt[2]})
                }
            }
            if (evnt[0] === 'EOSE') {
                console.log("end of stream")
            }
        }
    }
}