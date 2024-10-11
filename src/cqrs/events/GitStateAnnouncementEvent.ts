import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';
import {getTag, getTagStartingWith} from "../../utils/nostrEventUtils.ts";
import { Address } from '@welshman/util';
import {PublishTextNoteCommand} from "../commands/PublishTextNoteCommand.ts";
import type ICommandHandler from "../base/ICommandHandler.ts";
import { nip19 } from 'nostr-tools';
import {StartBuildCommand} from "../commands/StartBuildCommand.ts";
import {GetStateAnnouncementQuery} from "../queries/GetStateAnnouncementQuery.ts";
import type IQueryHandler from "../base/IQueryHandler.ts";
import {GetWatchSubscriptionQuery} from "../queries/GetWatchSubscriptionQuery.ts";
import {GetRepoAddressQuery} from "../queries/GetRepoAddressQuery.ts";
import {RepoWatchSubscription} from "../../RepoWatchSubscription.ts";
import {SaveWatchSubscriptionCommand} from "../commands/SaveWatchSubscriptionCommand.ts";

export class GitStateAnnouncementEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class GitStateAnnouncementEventHandler implements IEventHandler<GitStateAnnouncementEvent> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(StartBuildCommand.name) private startBuildCommandHanlder: ICommandHandler<StartBuildCommand>,
        @inject(PublishTextNoteCommand.name) private publishTextNoteCommandHandler: ICommandHandler<PublishTextNoteCommand>,
        @inject(GetRepoAddressQuery.name) private getRepoAddressQuery: IQueryHandler<GetRepoAddressQuery, Address>,
        @inject(GetWatchSubscriptionQuery.name) private getWatchSubscriptionQuery: IQueryHandler<GetWatchSubscriptionQuery, RepoWatchSubscription>,
        @inject(SaveWatchSubscriptionCommand.name) private saveWatchSubscriptionCommand: ICommandHandler<SaveWatchSubscriptionCommand>,
    ) {

    }

    async execute(event: GitStateAnnouncementEvent): Promise<void> {
        console.log(event.nostrEvent)

        // TODO: We need to verify the author, now everyone can send this event
        const authorNpub = nip19.npubEncode(event.nostrEvent.pubkey);
        const repoIdentifier = getTag(event.nostrEvent, "d")[1]

        // Doing this extra call to prevent getting a different naddr if relays are omitted from the naddr (maybe naddr is not a good identifier to store our state)
        const repoAddress = await this.getRepoAddressQuery.execute({pubkey: event.nostrEvent.pubkey, identifier: repoIdentifier})


        const watchSubscription = await this.getWatchSubscriptionQuery.execute({repoAddress: repoAddress})

       if(watchSubscription.latestStateAnnouncement === undefined){

           // Run build for each branch
       } else {
           const fullBranchNames = watchSubscription.branchNames.map(b => `refs/heads/${b}`)
           const commitsToBuild = watchSubscription.latestStateAnnouncement.tags
               .filter(t => fullBranchNames.includes(t[0]))
               .map(t => t[1])

           console.log(commitsToBuild)
       }

       watchSubscription.latestStateAnnouncement = event.nostrEvent;
       await this.saveWatchSubscriptionCommand.execute({subscription: watchSubscription})

        console.log("subscription:")
        console.log(watchSubscription)

        this.logger.info(`Detected state-announcement}, starting build.`)

        var refs = getTagStartingWith(event.nostrEvent, "refs/heads/")

        if(refs.length == 0){
            this.logger.warn("No refs provided")
            return;
        }

        // TODO: account for multiple refs
        var branchName = refs[0][0].split("refs/heads/")[1];
        var commitHash = refs[0][1];

        await this.startBuildCommandHanlder.execute({repoAddress: repoAddress, branchName: branchName, commitHash: commitHash})
        await this.publishTextNoteCommandHandler.execute({message: `nostr:${authorNpub} comitted to repo:${repoAddress.toNaddr()} `})
    }
}