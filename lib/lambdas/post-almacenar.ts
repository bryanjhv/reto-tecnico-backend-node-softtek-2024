import type { APIGatewayProxyHandler } from 'aws-lambda'
import * as process from 'node:process'
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'

interface Persona {
	id: string
	dni: string
	firstName: string
	lastName: string
}

const { ALMACENADOS_TABLE_NAME = '' } = process.env

const db = DynamoDBDocument.from(new DynamoDB())

export const handler: APIGatewayProxyHandler = async (event) => {
	if (!event.body) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				error: 'Missing request body',
			}),
		}
	}

	let body: Partial<Persona> | null
	try {
		body = JSON.parse(event.body)
		if (typeof body !== 'object') {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: 'Invalid request body',
				}),
			}
		}
	}
	// eslint-disable-next-line unused-imports/no-unused-vars
	catch (err) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				error: 'Could not parse body',
			}),
		}
	}

	if (!body?.dni || !body?.firstName || !body?.lastName
		|| typeof body?.dni !== 'string' || typeof body?.firstName !== 'string' || typeof body?.lastName !== 'string'
		|| body?.dni.length !== 8 || body?.firstName.length > 2 || body?.lastName.length > 2) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				error: 'Invalid persona data',
			}),
		}
	}

	try {
		body.id = body.dni
		await db.put({
			TableName: ALMACENADOS_TABLE_NAME,
			Item: body,
		})
		return {
			statusCode: 201,
			body: JSON.stringify(body),
		}
	}
	// eslint-disable-next-line unused-imports/no-unused-vars
	catch (err) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				error: 'Failed to save persona',
			}),
		}
	}
}
