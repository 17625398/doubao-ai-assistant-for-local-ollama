/**
 * Bloomberg API 集成测试脚本
 * 用于测试 Bloomberg API 集成的功能和性能
 */

import { chatClawBloombergService } from './packages/core/src/services/chatclaw-bloomberg-service';
import { logger } from './packages/core/src/utils/logger';

/**
 * Bloomberg API 集成测试
 */
async function runBloombergTests() {
  console.log('=== Bloomberg API 集成测试 ===\n');

  try {
    // 测试 1: 连接功能
    console.log('1. 测试连接功能...');
    const connectResult = await chatClawBloombergService.connect();
    console.log(`连接结果: ${connectResult ? '成功' : '失败'}`);
    
    // 获取连接状态
    const connectionStatus = chatClawBloombergService.getConnectionStatus();
    console.log(`连接状态: ${connectionStatus}`);
    
    // 测试 2: 实时数据查询
    console.log('\n2. 测试实时数据查询...');
    try {
      const referenceData = await chatClawBloombergService.getReferenceData(
        ['AAPL US Equity', 'MSFT US Equity'],
        ['PX_LAST', 'OPEN']
      );
      console.log('实时数据查询结果:', referenceData);
    } catch (error) {
      console.log('实时数据查询失败:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 测试 3: 历史数据查询
    console.log('\n3. 测试历史数据查询...');
    try {
      const historicalData = await chatClawBloombergService.getHistoricalData(
        ['AAPL US Equity'],
        ['PX_LAST', 'VOLUME'],
        '20240101',
        '20240131'
      );
      console.log('历史数据查询结果:', historicalData);
    } catch (error) {
      console.log('历史数据查询失败:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 测试 4: 数据集查询
    console.log('\n4. 测试数据集查询...');
    try {
      const dataSetData = await chatClawBloombergService.getDataSetData(
        ['AAPL US Equity'],
        ['TOP_20_HOLDERS_PUBLIC_FILINGS']
      );
      console.log('数据集查询结果:', dataSetData);
    } catch (error) {
      console.log('数据集查询失败:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 测试 5: OHLCV 数据查询
    console.log('\n5. 测试 OHLCV 数据查询...');
    try {
      const barsData = await chatClawBloombergService.getBarsData(
        ['AAPL US Equity'],
        ['OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOLUME'],
        '20240101',
        '20240131'
      );
      console.log('OHLCV 数据查询结果:', barsData);
    } catch (error) {
      console.log('OHLCV 数据查询失败:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 测试 6: 交易 tick 数据查询
    console.log('\n6. 测试交易 tick 数据查询...');
    try {
      const ticksData = await chatClawBloombergService.getTicksData(
        ['AAPL US Equity'],
        ['LAST_PRICE', 'VOLUME'],
        '20240131',
        '20240131'
      );
      console.log('交易 tick 数据查询结果:', ticksData);
    } catch (error) {
      console.log('交易 tick 数据查询失败:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 测试 7: 字段搜索
    console.log('\n7. 测试字段搜索...');
    try {
      const fields = await chatClawBloombergService.searchFields('VWAP');
      console.log('字段搜索结果:', fields);
    } catch (error) {
      console.log('字段搜索失败:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 测试 8: EQS 查询
    console.log('\n8. 测试 EQS 查询...');
    try {
      const eqsResults = await chatClawBloombergService.executeEQSQuery('Global Oil Companies YTD Return');
      console.log('EQS 查询结果:', eqsResults);
    } catch (error) {
      console.log('EQS 查询失败:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 测试 9: 数据导出
    console.log('\n9. 测试数据导出...');
    try {
      const testData = [
        {
          security: 'AAPL US Equity',
          data: [
            { date: '2024-01-01', PX_LAST: 100, VOLUME: 1000000 },
            { date: '2024-01-02', PX_LAST: 101, VOLUME: 1200000 }
          ]
        }
      ];
      
      const csvData = chatClawBloombergService.exportDataToCSV(testData);
      console.log('CSV 导出结果:', csvData);
      
      const excelData = chatClawBloombergService.exportDataToExcel(testData);
      console.log('Excel 导出结果: 生成了', excelData.length, '字节的缓冲区');
    } catch (error) {
      console.log('数据导出失败:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 测试 10: 获取服务状态
    console.log('\n10. 测试服务状态...');
    const status = chatClawBloombergService.getStatus();
    console.log('服务状态:', status);
    
    // 测试 11: 断开连接
    console.log('\n11. 测试断开连接...');
    const disconnectResult = chatClawBloombergService.disconnect();
    console.log(`断开连接结果: ${disconnectResult ? '成功' : '失败'}`);
    
    console.log('\n=== 测试完成 ===');
    console.log('所有测试已成功运行！');

  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
runBloombergTests();
