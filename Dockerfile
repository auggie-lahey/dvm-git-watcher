FROM denoland/deno:latest


WORKDIR /app

ADD . /app

RUN deno cache main.ts

CMD ["run", "--allow-net", "--allow-env", "--allow-all", "main.ts"]