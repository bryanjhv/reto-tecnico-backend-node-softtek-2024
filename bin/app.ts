/* eslint-disable no-new */

import * as process from 'node:process'
import { App } from 'aws-cdk-lib'
import { RetoStack } from '../lib/stack.js'
import 'dotenv/config'

const app = new App()
new RetoStack(app, 'RetoTecnicoBackendNodeSofttek2024', {
	swapiApiUrl: process.env['SWAPI_API_URL']!,
	tmdbApiKey: process.env['TMDB_API_KEY']!,
	tmdbApiUrl: process.env['TMDB_API_URL']!,
	env: { region: process.env['CDK_DEFAULT_REGION']! },

})
app.synth()
