import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import { Address } from '@welshman/util';
import {EventPublisher} from "../../publisher/EventPublisher.ts";
import type {IEventPublisher} from "../../publisher/EventPublisher.ts";

export class StartBuildCommand implements ICommand {
    repoAddress!: Address
    branchName!: string
    commitHash!: string
}

@injectable()
export class StartBuildCommandHandler implements ICommandHandler<StartBuildCommand> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(EventPublisher.name) private eventPublisher: IEventPublisher
    ) {
        this.logger = logger;
    }

    async execute(command: StartBuildCommand): Promise<void> {
        this.logger.info(`Triggering build for branch ${command.branchName} commit ${command.commitHash}`);
        // broadcast
        await this.eventPublisher.publish(
            68001,
            [
                [
                    "i",
                    command.repoAddress.toNaddr(),
                    "event",
                    "wss://relay.stens.dev"
                ],
                [
                    "param",
                    "commit_hash",
                    command.commitHash
                ],
                [
                    "output",
                    "docker-image"
                ],
                [
                    "relays",
                    "wss://relay.stens.dev"
                ],
                ["j", "docker-build"]
            ], "")
    }
}