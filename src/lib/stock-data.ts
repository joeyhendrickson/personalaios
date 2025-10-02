import { env } from './env'

export interface StockData {
  symbol: string
  latestPrice: number
  open: number
  high: number
  low: number
  volume: number
  date: string
  previousClose: number | null
  change: number | null
  changePercent: number | null
  source: string
}

export class StockDataService {
  private static async fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StockAnalyzer/1.0)',
        },
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private static async tryAlphaVantage(symbol: string): Promise<StockData | null> {
    if (!env.ALPHA_VANTAGE_API_KEY) return null

    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${env.ALPHA_VANTAGE_API_KEY}&outputsize=compact`
      const response = await this.fetchWithTimeout(url)
      const data = await response.json()

      if (data['Time Series (Daily)']) {
        const timeSeries = data['Time Series (Daily)']
        const dates = Object.keys(timeSeries).sort().reverse()
        const latestDate = dates[0]
        const latestData = timeSeries[latestDate]
        const previousClose = dates[1] ? parseFloat(timeSeries[dates[1]]['4. close']) : null

        return {
          symbol: symbol.toUpperCase(),
          latestPrice: parseFloat(latestData['4. close']),
          open: parseFloat(latestData['1. open']),
          high: parseFloat(latestData['2. high']),
          low: parseFloat(latestData['3. low']),
          volume: parseInt(latestData['5. volume']),
          date: latestDate,
          previousClose,
          change: previousClose ? parseFloat(latestData['4. close']) - previousClose : null,
          changePercent: previousClose
            ? ((parseFloat(latestData['4. close']) - previousClose) / previousClose) * 100
            : null,
          source: 'Alpha Vantage',
        }
      }
    } catch (error) {
      console.error('Alpha Vantage API error:', error)
    }
    return null
  }

  private static async tryIEXCloud(symbol: string): Promise<StockData | null> {
    if (!env.IEX_CLOUD_API_KEY) return null

    try {
      const url = `https://cloud.iexapis.com/stable/stock/${symbol}/quote?token=${env.IEX_CLOUD_API_KEY}`
      const response = await this.fetchWithTimeout(url)
      const data = await response.json()

      if (data.symbol) {
        return {
          symbol: data.symbol,
          latestPrice: data.latestPrice,
          open: data.open,
          high: data.high,
          low: data.low,
          volume: data.volume,
          date: data.latestUpdate
            ? new Date(data.latestUpdate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          previousClose: data.previousClose,
          change: data.change,
          changePercent: data.changePercent,
          source: 'IEX Cloud',
        }
      }
    } catch (error) {
      console.error('IEX Cloud API error:', error)
    }
    return null
  }

  private static async tryFinancialModelingPrep(symbol: string): Promise<StockData | null> {
    if (!env.FINANCIAL_MODELING_PREP_API_KEY) return null

    try {
      const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${env.FINANCIAL_MODELING_PREP_API_KEY}`
      const response = await this.fetchWithTimeout(url)
      const data = await response.json()

      if (data && data.length > 0 && data[0].symbol) {
        const stock = data[0]
        return {
          symbol: stock.symbol,
          latestPrice: stock.price,
          open: stock.open,
          high: stock.dayHigh,
          low: stock.dayLow,
          volume: stock.volume,
          date: new Date().toISOString().split('T')[0],
          previousClose: stock.previousClose,
          change: stock.change,
          changePercent: stock.changesPercentage,
          source: 'Financial Modeling Prep',
        }
      }
    } catch (error) {
      console.error('Financial Modeling Prep API error:', error)
    }
    return null
  }

  private static async tryYahooFinance(symbol: string): Promise<StockData | null> {
    try {
      // Using a more reliable Yahoo Finance endpoint
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`
      const response = await this.fetchWithTimeout(url)
      const data = await response.json()

      if (data.chart && data.chart.result && data.chart.result[0]) {
        const result = data.chart.result[0]
        const meta = result.meta
        const quotes = result.indicators.quote[0]

        if (meta.regularMarketPrice) {
          return {
            symbol: meta.symbol,
            latestPrice: meta.regularMarketPrice,
            open: meta.regularMarketOpen || quotes.open[quotes.open.length - 1],
            high: meta.regularMarketDayHigh || quotes.high[quotes.high.length - 1],
            low: meta.regularMarketDayLow || quotes.low[quotes.low.length - 1],
            volume: meta.regularMarketVolume || quotes.volume[quotes.volume.length - 1],
            date: new Date(meta.regularMarketTime * 1000).toISOString().split('T')[0],
            previousClose: meta.previousClose,
            change: meta.regularMarketPrice - meta.previousClose,
            changePercent:
              ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
            source: 'Yahoo Finance',
          }
        }
      }
    } catch (error) {
      console.error('Yahoo Finance API error:', error)
    }
    return null
  }

  private static async tryPolygonIO(symbol: string): Promise<StockData | null> {
    if (!env.POLYGON_API_KEY) return null

    try {
      // Polygon.io with API key for real-time data
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${env.POLYGON_API_KEY}`
      const response = await this.fetchWithTimeout(url)
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        return {
          symbol: symbol.toUpperCase(),
          latestPrice: result.c,
          open: result.o,
          high: result.h,
          low: result.l,
          volume: result.v,
          date: new Date(result.t).toISOString().split('T')[0],
          previousClose: result.c, // Using close as previous close for now
          change: null,
          changePercent: null,
          source: 'Polygon.io',
        }
      }
    } catch (error) {
      console.error('Polygon.io API error:', error)
    }
    return null
  }

  static async getStockData(symbol: string): Promise<StockData | null> {
    if (!symbol || symbol.trim() === '') {
      throw new Error('Stock symbol is required')
    }

    const cleanSymbol = symbol.trim().toUpperCase()

    // Try APIs in order of preference (Polygon.io first for accuracy, then others)
    const dataSources = [
      () => this.tryPolygonIO(cleanSymbol),
      () => this.tryAlphaVantage(cleanSymbol),
      () => this.tryIEXCloud(cleanSymbol),
      () => this.tryFinancialModelingPrep(cleanSymbol),
      () => this.tryYahooFinance(cleanSymbol),
    ]

    for (const dataSource of dataSources) {
      try {
        const result = await dataSource()
        if (result) {
          console.log(`Successfully fetched ${cleanSymbol} data from ${result.source}`)
          return result
        }
      } catch (error) {
        console.error(`Data source failed:`, error)
        continue
      }
    }

    console.error(`All data sources failed for symbol: ${cleanSymbol}`)
    return null
  }
}
