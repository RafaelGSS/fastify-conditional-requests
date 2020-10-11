import fastifyPlugin from 'fastify-plugin';
import * as http from 'http';
import { FastifyInstance, FastifyReply, FastifyRequest, FastifyPluginAsync } from 'fastify';

const forwardHeaders = ['Authorization'];

/**
 * This plugin consider RFC 6586 and RFC 6585
 */
const optimisticLocking: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  const validateEtag = async (request: FastifyRequest, reply: FastifyReply) => {
    const ifMatch = request.headers['if-match'];
    if (!ifMatch) {
      return reply.code(428).send('');
    }

    const headers: { etag?: string } = await new Promise((resolve, reject) => {
      let options: http.RequestOptions = {
        method: 'HEAD',
        protocol: request.protocol + ':',
        hostname: request.hostname.split(':')[0],
        port: request.hostname.split(':')[1],
        path: request.url,
        headers: {},
      };

      options.headers = forwardHeaders
        .map((name: string) => ({ name: request.headers[name] }))
        .reduce((prev, curr) => ({ ...prev, curr }));

      http.request(options, (res: http.IncomingMessage) => resolve(res.headers as any))
        .on('error', reject)
        .end();
    });

    if (headers['etag'] && headers['etag'] !== ifMatch) {
      return reply.code(412).send('');
    }
  };

  fastify.decorate('validateEtag', validateEtag);
}

export default fastifyPlugin(optimisticLocking, {});
