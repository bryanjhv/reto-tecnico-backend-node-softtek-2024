import type { StackProps } from 'aws-cdk-lib'
import type { NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import type { Construct } from 'constructs'
import { join } from 'node:path'
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway'
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'

interface RetoStackProps extends StackProps {
	swapiApiUrl: string
	tmdbApiKey: string
	tmdbApiUrl: string
}

export class RetoStack extends Stack {
	constructor(scope: Construct, id: string, props: RetoStackProps) {
		super(scope, id, props)

		const fusionadosTable = new Table(this, 'fusionadosTable', {
			partitionKey: {
				name: 'id',
				type: AttributeType.NUMBER,
			},
			tableName: 'fusionados',
			removalPolicy: RemovalPolicy.DESTROY,
		})

		const cacheadosTable = new Table(this, 'cacheadosTable', {
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING,
			},
			sortKey: {
				name: 'expireAt',
				type: AttributeType.NUMBER,
			},
			tableName: 'cacheados',
			timeToLiveAttribute: 'expireAt',
			removalPolicy: RemovalPolicy.DESTROY,
		})

		const almacenadosTable = new Table(this, 'almacenadosTable', {
			partitionKey: {
				name: 'id',
				type: AttributeType.STRING,
			},
			tableName: 'almacenados',
			removalPolicy: RemovalPolicy.DESTROY,
		})

		const nodeJsFunctionProps: NodejsFunctionProps = {
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.seconds(30),
			memorySize: 128,
		}

		const getFusionadosLambda = new NodejsFunction(this, 'getFusionadosFunction', {
			entry: join(__dirname, 'lambdas', 'get-fusionados.ts'),
			environment: {
				SWAPI_API_URL: props.swapiApiUrl,
				TMDB_API_KEY: props.tmdbApiKey,
				TMDB_API_URL: props.tmdbApiUrl,
				CACHEADOS_TABLE_NAME: cacheadosTable.tableName,
				FUSIONADOS_TABLE_NAME: fusionadosTable.tableName,
			},
			...nodeJsFunctionProps,
		})

		const postAlmacenarLambda = new NodejsFunction(this, 'postAlmacenarFunction', {
			entry: join(__dirname, 'lambdas', 'post-almacenar.ts'),
			environment: {
				ALMACENADOS_TABLE_NAME: almacenadosTable.tableName,
			},
			...nodeJsFunctionProps,
		})

		const getHistorialLambda = new NodejsFunction(this, 'getHistorialFunction', {
			entry: join(__dirname, 'lambdas', 'get-historial.ts'),
			environment: {
				CACHEADOS_TABLE_NAME: cacheadosTable.tableName,
			},
			...nodeJsFunctionProps,
		})

		fusionadosTable.grantReadWriteData(getFusionadosLambda)
		cacheadosTable.grantReadWriteData(getFusionadosLambda)
		cacheadosTable.grantReadData(getHistorialLambda)
		almacenadosTable.grantWriteData(postAlmacenarLambda)

		const getFusionadosIntegration = new LambdaIntegration(getFusionadosLambda)
		const postAlmacenarIntegration = new LambdaIntegration(postAlmacenarLambda)
		const getHistorialIntegration = new LambdaIntegration(getHistorialLambda)

		const restApi = new RestApi(this, 'retoRestApi', {
			restApiName: 'Reto Tcnico Backend Node Softtek 2024',
		})

		restApi.root.addResource('fusionados').addMethod('GET', getFusionadosIntegration)
		restApi.root.addResource('almacenar').addMethod('POST', postAlmacenarIntegration)
		restApi.root.addResource('historial').addMethod('GET', getHistorialIntegration)
	}
}
