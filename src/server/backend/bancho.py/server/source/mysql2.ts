import mysql from 'mysql2/promise'
import { config } from '../../env'

const pool = mysql.createPool({
  uri: config().dsn,
})

export default pool
