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
import {EventListenerRegistry} from "../../listeners/base/EventListenerRegistry.ts";
import type {IEventListenerRegistry} from "../../listeners/base/IEventListenerRegistry.ts";

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
    eventListenerRegistry: IEventListenerRegistry;

    constructor(
        @inject("Logger") logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
        @inject(EventListenerRegistry.name) eventListenerRegistry: IEventListenerRegistry,
    ) {
        this.logger = logger;
        this.relay = relayProvider.getDefaultPool();
        this.publishTextNoteCommandHandler = resolveCommandHandler(PublishTextNoteCommand.name)
        this.gitPatchEventHandler = resolveEventHandler(GitPatchEvent.name)
        this.gitStateAnnouncementEventHandler = resolveEventHandler(GitStateAnnouncementEvent.name)
        this.eventListenerRegistry = eventListenerRegistry;

        this.events = new NSet()
    }

    async execute(command: WatchRepositoryCommand): Promise<void> {
        // subscribe to events for repository
        const repoKind = command.repoAddress.kind;
        const repoOwnerPubkey = command.repoAddress.pubkey;
        const repoIdentifier = command.repoAddress.identifier;

        // Listen for patches
        this.eventListenerRegistry.add(
            `listen-patch-${command.repoAddress.toNaddr}`,
            [
                {
                    kinds: [1617], // 1617 = Patches
                    "#a": [`${repoKind}:${repoOwnerPubkey}:${repoIdentifier}`],
                    limit: 50,
                    since: nostrNow(),
                }
            ],
            this.gitPatchEventHandler
        )

        // Listen for state announcements (commit by maintainer)
        this.eventListenerRegistry.add(
            `listen-state-announcment-${command.repoAddress.toNaddr}`,
            [
                {
                    kinds: [30618], // 30618 = State announcement
                    authors: [repoOwnerPubkey],
                    "#d": [repoIdentifier],
                    limit: 50,
                    since: nostrNow(),
                }
            ],
            this.gitStateAnnouncementEventHandler
        )

        // broadcast
        await this.publishTextNoteCommandHandler.execute({message: `I started watching the following repository until ${command.watchUntil}. nostr:${command.repoAddress.toNaddr()} `})
        console.log(`Started listening to repo: ${command.repoAddress}`)
    }
}