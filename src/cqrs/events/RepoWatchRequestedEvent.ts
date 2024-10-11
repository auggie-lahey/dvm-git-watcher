import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';
import {getParams, getTag} from "../../utils/nostrEventUtils.ts";
import { Address } from '@welshman/util';
import {WatchRepositoryCommand} from "../commands/WatchRepositoryCommand.ts";
import type ICommandHandler from "../base/ICommandHandler.ts";
import {GetRepoAddressQuery} from "../queries/GetRepoAddressQuery.ts";
import type IQueryHandler from "../base/IQueryHandler.ts";

export class RepoWatchRequestedEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class RepoWatchRequestedEventHandler implements IEventHandler<RepoWatchRequestedEvent> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(WatchRepositoryCommand.name) private watchRepositoryCommandHandler: ICommandHandler<WatchRepositoryCommand>,
        @inject(GetRepoAddressQuery.name) private getRepoAddressQueryHandler: IQueryHandler<GetRepoAddressQuery, Address>,
    ) {
    }

    async execute(event: RepoWatchRequestedEvent): Promise<void> {
        // TODO: validation
        const params = getParams(event.nostrEvent);

        const watchUntil = Number( params.get("watch_untill"));
        const branchName = params.get("branch_name") || "some-other-branch"; // TODO: remove hardcode

        if (watchUntil === undefined || branchName === undefined) {
            console.log("missing parameter(s), required params: watch_untill, branch_name");
            return;
        }

        try {
            const iTag = getTag(event.nostrEvent, "i");
            const userProvidedRepoAddress = Address.fromNaddr(iTag[1]);

            const repoAddress = await this.getRepoAddressQueryHandler.execute({pubkey: userProvidedRepoAddress.pubkey, identifier: userProvidedRepoAddress.identifier})

            await this.watchRepositoryCommandHandler.execute({repoAddress: repoAddress, branchName: branchName, watchUntil: watchUntil})
        } catch (e){
            console.log(e)
            this.logger.error("error when trying to start watch.")
        }
    }
}