import type { QueryCommandInput } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import * as process from 'node:process'
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'

const { CACHEADOS_TABLE_NAME = '' } = process.env

const db = DynamoDBDocument.from(new DynamoDB())

export const handler: APIGatewayProxyHandler = async () => {
	const now = Math.round(Date.now() / 1000)

	let key: Record<string, any> | undefined
	const input: QueryCommandInput = {
		TableName: CACHEADOS_TABLE_NAME,
		KeyConditionExpression: 'expireAt > :now',
		ExpressionAttributeValues: {
			':now': now,
		},
	}

	const results = []
	do {
		const { Items, LastEvaluatedKey } = await db.query(input)
		if (Items?.length)
			results.push(...Items)
		key = LastEvaluatedKey
	} while (!key)

	return {
		statusCode: 200,
		body: JSON.stringify(results),
	}
}
