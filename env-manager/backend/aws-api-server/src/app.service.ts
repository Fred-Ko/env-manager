import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { STS, SecretsManager } from 'aws-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Secret } from './sqlite.module';

@Injectable()
export class AppService {
  private secretsManager: SecretsManager;

  constructor(
    @InjectRepository(Secret)
    private secretRepository: Repository<Secret>
  ) {}

  private checkSecretsManager() {
    if (!this.secretsManager) {
      throw new HttpException('Failed to access SecretsManager', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async login(accessKeyId: string, secretAccessKey: string, region: string) {
    this.secretsManager = new SecretsManager({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    const sts = new STS({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    try {
      await sts.getCallerIdentity({}).promise();
    } catch (error) {
      console.error(`Invalid AWS credentials: ${error}`);
      throw new HttpException('Invalid AWS credentials', HttpStatus.UNAUTHORIZED);
    }
  }

  async getSecrets(query: string) {
    this.checkSecretsManager();
    const secretsList = await this.getAllSecrets();

    const secretsListFromDB = await this.secretRepository.find({
      where: { name: In(secretsList.map((secret) => secret.Name)) },
      select: {
        name: true,
      },
    });

    const secretNames = secretsList.filter(
      (secret) => !secretsListFromDB.map((e) => e.name).includes(secret.Name)
    );

    try {
      const secrets = await this.getSecretsFromList(secretNames);
      for (const secretData of secrets.flat()) {
        const { name, path, value } = secretData;

        const secret = new Secret();
        secret.name = name;
        secret.path = path;
        secret.value = value;
        await this.secretRepository.save(secret);
      }

      const ret = query
        ? await this.secretRepository.query(query)
        : await this.secretRepository.find();
      return ret.map((e) => {
        const { id, ...rest } = e;
        return rest;
      });
    } catch (e) {
      console.error(e);
    }
  }

  async updateSecret(secretName: string, jmsPaths: string[], newValues: string[]) {
    this.checkSecretsManager();
    let parsedSecret = await this.getSecretValue(secretName);
    parsedSecret = await this.updateParsedSecret(parsedSecret, jmsPaths, newValues);

    try {
      await this.secretsManager
        .updateSecret({
          SecretId: secretName,
          SecretString: JSON.stringify(parsedSecret),
        })
        .promise();
      return { success: true };
    } catch (error) {
      console.error(`Error updating secret: ${secretName}`);
      console.error(error);
      return { success: false, error: error.message };
    }
  }

  private async getSecretValue(secretName: string) {
    this.checkSecretsManager();
    const secretValue = await this.secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();
    let parsedSecret;
    try {
      parsedSecret = JSON.parse(secretValue.SecretString);
    } catch (error) {
      console.error(`Error parsing secret: ${secretName}`);
      console.error(`Value: ${secretValue.SecretString}`);
    }
    return parsedSecret;
  }

  private async getAllSecrets(nextToken?: string, secretList: any[] = []) {
    this.checkSecretsManager();
    const secretsList = nextToken
      ? await this.secretsManager.listSecrets({ NextToken: nextToken }).promise()
      : await this.secretsManager.listSecrets({}).promise();
    const newSecretList = secretList.concat(secretsList.SecretList);
    return secretsList.NextToken
      ? this.getAllSecrets(secretsList.NextToken, newSecretList)
      : newSecretList;
  }

  private flattenSecret(secret, path = []) {
    if (typeof secret !== 'object' || secret === null) {
      return [{ path: path.join('.'), value: secret }];
    }

    return Object.keys(secret).flatMap((key) => this.flattenSecret(secret[key], [...path, key]));
  }

  private async getSecretsFromList(secretsList) {
    return Promise.all(
      secretsList.map(async (secret) => {
        const parsedSecret = await this.getSecretValue(secret.Name);
        return this.flattenSecret(parsedSecret).map(({ path, value }) => ({
          name: `${secret.Name}`,
          path: `${path}`,
          value,
        }));
      })
    );
  }

  private async updateParsedSecret(parsedSecret, jmsPaths: string[], newValues: string[]) {
    for (let j = 0; j < jmsPaths.length; j++) {
      const paths = jmsPaths[j].split('.');
      let current = parsedSecret;
      for (let i = 0; i < paths.length - 1; i++) {
        current = current[paths[i]];
      }
      current[paths[paths.length - 1]] = newValues[j];
    }
    return parsedSecret;
  }
}
