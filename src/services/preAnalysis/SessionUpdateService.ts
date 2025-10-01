import { supabase } from '@/lib/supabase';
import type { AnalysisStep } from '@/types/preAnalysis';

/**
 * 사전 분석 세션 업데이트 헬퍼 서비스
 */

export class SessionUpdateService {
  /**
   * 세션 진행 상황 업데이트
   */
  static async updateSessionProgress(
    sessionId: string,
    currentStep: AnalysisStep,
    progress: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      console.log(`📊 [SessionUpdate] 진행률 업데이트 시작:`, {
        sessionId,
        currentStep,
        progress,
        timestamp: new Date().toISOString()
      });

      // 기존 metadata 조회
      const { data: session, error: fetchError } = await supabase
        .from('pre_analysis_sessions')
        .select('metadata')
        .eq('id', sessionId)
        .single();

      if (fetchError) {
        console.error('❌ 세션 조회 실패:', fetchError);
        throw new Error(`세션 조회 실패: ${fetchError.message}`);
      }

      // 기존 metadata와 병합
      const existingMetadata = (session?.metadata || {}) as Record<string, any>;
      const newMetadata: Record<string, any> = {
        ...existingMetadata,
        current_step: currentStep,
        last_updated: new Date().toISOString(),
      };

      // 단계별 진행률 저장
      if (currentStep === 'analysis') {
        newMetadata['analysis_progress'] = Math.round(progress);
        console.log(`📈 분석 진행률: ${Math.round(progress)}%`);
      } else if (currentStep === 'questions') {
        newMetadata['questions_progress'] = Math.round(progress);
        console.log(`❓ 질문 생성 진행률: ${Math.round(progress)}%`);
      }

      const { error } = await supabase
        .from('pre_analysis_sessions')
        .update({
          metadata: newMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ 세션 진행 상황 업데이트 실패:', error);
        throw new Error(`세션 업데이트 실패: ${error.message}`);
      }

      console.log('✅ 진행률 업데이트 성공');

      // 업데이트 결과 검증
      const { data: verifyData, error: verifyError } = await supabase
        .from('pre_analysis_sessions')
        .select('metadata')
        .eq('id', sessionId)
        .single();

      if (!verifyError && verifyData) {
        const verifyMetadata = verifyData.metadata as Record<string, any>;
        const savedProgress = currentStep === 'analysis'
          ? verifyMetadata['analysis_progress']
          : verifyMetadata['questions_progress'];

        console.log(`🔍 검증: DB에 저장된 진행률 = ${savedProgress}%`);

        if (savedProgress !== Math.round(progress)) {
          console.warn(`⚠️ 진행률 불일치 감지: 요청=${Math.round(progress)}%, 저장=${savedProgress}%`);
        }
      }

      return { success: true };

    } catch (error) {
      console.error('❌ 세션 업데이트 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  /**
   * 세션 상태 업데이트
   */
  static async updateSessionStatus(
    sessionId: string,
    status: 'processing' | 'completed' | 'failed' | 'cancelled'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData['completed_at'] = new Date().toISOString();
      }

      const { error } = await supabase
        .from('pre_analysis_sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (error) {
        console.error('세션 상태 업데이트 실패:', error);
        throw new Error(`세션 상태 업데이트 실패: ${error.message}`);
      }

      return { success: true };

    } catch (error) {
      console.error('세션 상태 업데이트 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }
}