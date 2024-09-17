import sql from 'mssql'
import { FastifyBaseLogger } from 'fastify'

export default class Document {
  schema: string = '[document].'
  _logger: FastifyBaseLogger
  _pool: sql.ConnectionPool

  constructor(logger: FastifyBaseLogger, pool: sql.ConnectionPool) {
    this._logger = logger
    this._pool = pool
  }

  async getGuidByParams(company: string, objecttype: string, documenttype: string, itemnum: string, language: string, size: string, swp: boolean) {
    const r = new sql.Request(this._pool)
    r.input('company', sql.VarChar, company)
    r.input('objecttype', sql.VarChar, objecttype)
    r.input('documenttype', sql.VarChar, documenttype)
    r.input('itemnum', sql.VarChar, itemnum)
    r.input('language', sql.VarChar, language)
    r.input('size', sql.VarChar, size)

    const result = await r.execute('GetDocumentGuidByParams')

    if (result.recordsets && result.recordsets[1].length > 0 && result.recordsets[1][0]) {
      return {
        error: result.recordset[0].error,
        verified: result.recordset[0].verified,
        result: result.recordsets[1][0][0] || []
      }
    }
    if (swp) {
      this._logger.debug(`Found no records, returning undefined!`)
      return undefined
    }
    this._logger.debug(`Found no records, returning undefined!`)
    return { result: { guid: '6258fae1-fbd0-45f1-8aef-68b76a30276e' } }
  }
}