import type { APIGatewayProxyHandler } from 'aws-lambda'
import * as process from 'node:process'
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'

const {
	TMDB_API_KEY = '',
	TMDB_API_URL = '',
	SWAPI_API_URL = '',
	CACHEADOS_TABLE_NAME = '',
	FUSIONADOS_TABLE_NAME = '',
} = process.env

interface SwapiFilm {
	title: string
	episode_id: number
	opening_crawl: string
	director: string
	producer: string
	release_date: string
}

interface TmdbSearch {
	results: {
		title: string
		poster_path: string
		release_date: string
	}[]
}

interface ApiFilm {
	id: number
	titulo: string
	director: string
	productor: string
	fecha_lanzamiento: string
	url_imagen: string
}

const db = DynamoDBDocument.from(new DynamoDB())

async function getOrCacheUrl<T>(url: string) {
	const now = Math.round(Date.now() / 1000)

	const { Items } = await db.query({
		TableName: CACHEADOS_TABLE_NAME,
		KeyConditionExpression: 'id = :id and expireAt > :now',
		ExpressionAttributeValues: {
			':id': url,
			':now': now,
		},
	})

	if (Items?.length)
		return JSON.parse(Items[0]!['res']) as T

	const res = await fetch(url)
	if (!res.ok)
		return null

	const data = await res.json()
	await db.put({
		TableName: CACHEADOS_TABLE_NAME,
		Item: {
			id: url,
			res: JSON.stringify(data),
			expireAt: now + 1800,
		},
	})
	return data as T
}

export const handler: APIGatewayProxyHandler = async (event) => {
	const id = event.queryStringParameters?.['id']
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				error: 'Missing required parameter "id"',
			}),
		}
	}

	const { Item: savedFilm } = await db.get({
		TableName: FUSIONADOS_TABLE_NAME,
		Key: { id: +id },
	})
	if (savedFilm) {
		return {
			statusCode: 200,
			body: JSON.stringify(savedFilm),
		}
	}

	const filmUrl = `${SWAPI_API_URL}/films/${id}/`
	const swapiFilm = await getOrCacheUrl<SwapiFilm>(filmUrl)
	if (!swapiFilm) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				error: 'Failed to fetch upstream film',
			}),
		}
	}

	const tmdbUrl = `${TMDB_API_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(swapiFilm.title)}&year=${swapiFilm.release_date.slice(0, 4)}`
	const tmdbSearch = await getOrCacheUrl<TmdbSearch>(tmdbUrl)
	if (!tmdbSearch) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				error: 'Failed to fetch upstream search',
			}),
		}
	}

	const searchFilm = tmdbSearch.results[0]!
	const film: ApiFilm = {
		id: +id,
		titulo: searchFilm.title,
		director: swapiFilm.director,
		productor: swapiFilm.producer,
		fecha_lanzamiento: searchFilm.release_date,
		url_imagen: `https://image.tmdb.org/t/p/w500${searchFilm.poster_path}`,
	}

	await db.put({
		TableName: FUSIONADOS_TABLE_NAME,
		Item: film,
	})

	return {
		statusCode: 200,
		body: JSON.stringify(film),
	}
}
