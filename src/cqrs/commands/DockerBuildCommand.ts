import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import { dockerCommand } from "docker-cli-js";
import { ensureDir } from "https://deno.land/std/fs/mod.ts";

export class DockerBuildCommand implements ICommand {
    workDir!: string
    outputImageDir!: string
    dockerfilePath: string = "."
    imageTag!: string
}

@injectable()
export class DockerBuildCommandHandler implements ICommandHandler<DockerBuildCommand> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
    ) {
    }

    async execute(command: DockerBuildCommand): Promise<void> {
        this.logger.info(`Running docker build ${command.workDir}`);

        const options = {
            machineName: null, // uses local docker
            currentWorkingDirectory: command.workDir, // uses current working directory
            echo: true, // echo command output to stdout/stderr
            platform: "linux/amd64"
        };

        try{
            const data = await dockerCommand(`build -t ${command.imageTag} ${command.dockerfilePath}`, options);

            await ensureDir(command.outputImageDir);
            const data2 = await dockerCommand(`save ${command.imageTag} > ${command.outputImageDir}/${command.imageTag}.tar`);

            console.log(data)
            console.log(data2)
        } catch (error) {
            console.log(error)
        }

    }
}