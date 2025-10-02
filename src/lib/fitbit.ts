import axios from 'axios'
import { env } from './env'

export interface FitbitTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  token_type: string
  user_id: string
}

export interface FitbitSleepData {
  sleep: Array<{
    dateOfSleep: string
    duration: number
    efficiency: number
    endTime: string
    infoCode: number
    isMainSleep: boolean
    levels: {
      data: Array<{
        dateTime: string
        level: string
        seconds: number
      }>
      summary: {
        deep: { count: number; minutes: number }
        light: { count: number; minutes: number }
        rem: { count: number; minutes: number }
        wake: { count: number; minutes: number }
      }
    }
    minutesAfterWakeup: number
    minutesAsleep: number
    minutesAwake: number
    minutesToFallAsleep: number
    startTime: string
    timeInBed: number
    type: string
  }>
  summary: {
    stages: {
      deep: number
      light: number
      rem: number
      wake: number
    }
    totalMinutesAsleep: number
    totalSleepRecords: number
    totalTimeInBed: number
  }
}

export interface FitbitHeartRateData {
  'activities-heart': Array<{
    dateTime: string
    value: {
      customHeartRateZones: Array<{
        caloriesOut: number
        max: number
        min: number
        minutes: number
        name: string
      }>
      heartRateZones: Array<{
        caloriesOut: number
        max: number
        min: number
        minutes: number
        name: string
      }>
      restingHeartRate: number
    }
  }>
  'activities-heart-intraday': {
    dataset: Array<{
      time: string
      value: number
    }>
    datasetInterval: number
    datasetType: string
  }
}

export interface FitbitActivityData {
  'activities-steps': Array<{
    dateTime: string
    value: string
  }>
  'activities-distance': Array<{
    dateTime: string
    value: string
  }>
  'activities-calories': Array<{
    dateTime: string
    value: string
  }>
  'activities-minutesSedentary': Array<{
    dateTime: string
    value: string
  }>
  'activities-minutesLightlyActive': Array<{
    dateTime: string
    value: string
  }>
  'activities-minutesFairlyActive': Array<{
    dateTime: string
    value: string
  }>
  'activities-minutesVeryActive': Array<{
    dateTime: string
    value: string
  }>
  'activities-floors': Array<{
    dateTime: string
    value: string
  }>
  'activities-elevation': Array<{
    dateTime: string
    value: string
  }>
}

export class FitbitAPI {
  private baseURL = 'https://api.fitbit.com'
  private authURL = 'https://www.fitbit.com'

  constructor() {
    if (!env.FITBIT_CLIENT_ID || !env.FITBIT_CLIENT_SECRET) {
      throw new Error('Fitbit credentials not configured')
    }
  }

  // Generate OAuth authorization URL
  getAuthorizationURL(redirectURI: string, state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.FITBIT_CLIENT_ID!,
      redirect_uri: redirectURI,
      scope: 'sleep heartrate activity profile',
      state: state || 'default',
    })

    return `${this.authURL}/oauth2/authorize?${params.toString()}`
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string, redirectURI: string): Promise<FitbitTokenResponse> {
    const credentials = Buffer.from(`${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`).toString(
      'base64'
    )

    try {
      const response = await axios.post(
        `${this.baseURL}/oauth2/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectURI,
        }),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      return response.data
    } catch (error) {
      console.error('Error exchanging code for token:', error)
      throw new Error('Failed to exchange authorization code for access token')
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<FitbitTokenResponse> {
    const credentials = Buffer.from(`${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`).toString(
      'base64'
    )

    try {
      const response = await axios.post(
        `${this.baseURL}/oauth2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      return response.data
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw new Error('Failed to refresh access token')
    }
  }

  // Get sleep data for a specific date
  async getSleepData(accessToken: string, date: string): Promise<FitbitSleepData> {
    try {
      const response = await axios.get(`${this.baseURL}/1.2/user/-/sleep/date/${date}.json`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      return response.data
    } catch (error) {
      console.error('Error fetching sleep data:', error)
      throw new Error('Failed to fetch sleep data')
    }
  }

  // Get heart rate data for a specific date
  async getHeartRateData(accessToken: string, date: string): Promise<FitbitHeartRateData> {
    try {
      const response = await axios.get(
        `${this.baseURL}/1/user/-/activities/heart/date/${date}/1d.json`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      return response.data
    } catch (error) {
      console.error('Error fetching heart rate data:', error)
      throw new Error('Failed to fetch heart rate data')
    }
  }

  // Get activity data for a specific date
  async getActivityData(accessToken: string, date: string): Promise<FitbitActivityData> {
    try {
      const response = await axios.get(`${this.baseURL}/1/user/-/activities/date/${date}.json`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      return response.data
    } catch (error) {
      console.error('Error fetching activity data:', error)
      throw new Error('Failed to fetch activity data')
    }
  }

  // Get sleep data for a date range
  async getSleepDataRange(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<FitbitSleepData> {
    try {
      const response = await axios.get(
        `${this.baseURL}/1.2/user/-/sleep/date/${startDate}/${endDate}.json`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      return response.data
    } catch (error) {
      console.error('Error fetching sleep data range:', error)
      throw new Error('Failed to fetch sleep data range')
    }
  }

  // Get heart rate data for a date range
  async getHeartRateDataRange(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<FitbitHeartRateData> {
    try {
      const response = await axios.get(
        `${this.baseURL}/1/user/-/activities/heart/date/${startDate}/${endDate}.json`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      return response.data
    } catch (error) {
      console.error('Error fetching heart rate data range:', error)
      throw new Error('Failed to fetch heart rate data range')
    }
  }

  // Get activity data for a date range
  async getActivityDataRange(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<FitbitActivityData> {
    try {
      const response = await axios.get(
        `${this.baseURL}/1/user/-/activities/date/${startDate}/${endDate}.json`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      return response.data
    } catch (error) {
      console.error('Error fetching activity data range:', error)
      throw new Error('Failed to fetch activity data range')
    }
  }
}

export const fitbitAPI = new FitbitAPI()
