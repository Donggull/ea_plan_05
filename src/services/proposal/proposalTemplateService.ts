import { supabase } from '../../lib/supabase'

export interface ProposalTemplate {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  html_template: string
  css_styles: string | null
  template_type: 'standard' | 'technical' | 'creative' | 'business' | 'modern'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TemplateSelection {
  id: string
  project_id: string
  template_id: string
  selected_by: string | null
  selected_at: string | null
  template?: ProposalTemplate
}

export interface ApplyTemplateParams {
  templateId: string
  proposalData: any
  projectId: string
  projectName?: string
  companyName?: string
  contactEmail?: string
}

export interface AppliedTemplate {
  html: string
  css: string
  templateInfo: ProposalTemplate
}

export class ProposalTemplateService {
  /**
   * 사용 가능한 템플릿 목록 조회
   */
  static async getAvailableTemplates(): Promise<ProposalTemplate[]> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('proposal_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)

      // 테이블이 존재하지 않는 경우
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error(
          '템플릿 테이블이 존재하지 않습니다. ' +
          'Supabase에서 scripts/create_proposal_templates_tables.sql을 실행하세요.'
        )
      }

      // 권한 오류
      if (error.message?.includes('permission') || error.message?.includes('policy')) {
        throw new Error('템플릿 조회 권한이 없습니다. RLS 정책을 확인하세요.')
      }

      // 기타 오류
      throw new Error(`템플릿 목록 조회 실패: ${error.message}`)
    }

    return (data as ProposalTemplate[]) || []
  }

  /**
   * 특정 템플릿 조회
   */
  static async getTemplateById(templateId: string): Promise<ProposalTemplate> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('proposal_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error) {
      console.error('Error fetching template:', error)

      // 템플릿을 찾을 수 없는 경우
      if (error.code === 'PGRST116') {
        throw new Error(`템플릿을 찾을 수 없습니다 (ID: ${templateId})`)
      }

      // 테이블이 존재하지 않는 경우
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error(
          '템플릿 테이블이 존재하지 않습니다. ' +
          'Supabase에서 scripts/create_proposal_templates_tables.sql을 실행하세요.'
        )
      }

      // 기타 오류
      throw new Error(`템플릿 조회 실패: ${error.message}`)
    }

    return data as ProposalTemplate
  }

  /**
   * 템플릿 선택 저장
   */
  static async saveTemplateSelection(selection: {
    projectId: string
    templateId: string
    selectedBy: string
  }): Promise<TemplateSelection> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // upsert를 사용하여 기존 선택이 있으면 업데이트, 없으면 삽입
    const { data, error } = await supabase
      .from('proposal_template_selections')
      .upsert(
        {
          project_id: selection.projectId,
          template_id: selection.templateId,
          selected_by: selection.selectedBy,
          selected_at: new Date().toISOString()
        },
        {
          onConflict: 'project_id'
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving template selection:', error)

      // 테이블이 존재하지 않는 경우
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error(
          '템플릿 선택 테이블이 존재하지 않습니다. ' +
          'Supabase에서 scripts/create_proposal_templates_tables.sql을 실행하세요.'
        )
      }

      // 외래 키 제약 조건 위반 (템플릿 ID가 존재하지 않음)
      if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
        throw new Error(`선택한 템플릿이 존재하지 않거나 프로젝트가 유효하지 않습니다.`)
      }

      // 권한 오류
      if (error.message?.includes('permission') || error.message?.includes('policy')) {
        throw new Error('템플릿 선택 저장 권한이 없습니다. RLS 정책을 확인하세요.')
      }

      // 기타 오류
      throw new Error(`템플릿 선택 저장 실패: ${error.message}`)
    }

    return data as TemplateSelection
  }

  /**
   * 선택된 템플릿 조회 (템플릿 정보 포함)
   */
  static async getSelectedTemplate(
    projectId: string
  ): Promise<TemplateSelection | null> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('proposal_template_selections')
      .select(
        `
        *,
        template:proposal_templates!template_id(*)
      `
      )
      .eq('project_id', projectId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching selected template:', error)

      // 테이블이 존재하지 않는 경우
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error(
          '템플릿 선택 테이블이 존재하지 않습니다. ' +
          'Supabase에서 scripts/create_proposal_templates_tables.sql을 실행하세요.'
        )
      }

      // 권한 오류
      if (error.message?.includes('permission') || error.message?.includes('policy')) {
        throw new Error('템플릿 선택 조회 권한이 없습니다. RLS 정책을 확인하세요.')
      }

      // 기타 오류
      throw new Error(`선택된 템플릿 조회 실패: ${error.message}`)
    }

    return data as TemplateSelection | null
  }

  /**
   * 템플릿에 제안서 데이터 적용
   */
  static async applyTemplate(
    params: ApplyTemplateParams
  ): Promise<AppliedTemplate> {
    // 1. 템플릿 로드
    const template = await this.getTemplateById(params.templateId)

    if (!template) {
      throw new Error('Template not found')
    }

    // 2. 템플릿 변수 치환
    let html = template.html_template
    const proposalData = params.proposalData

    // 기본 프로젝트 정보 치환
    html = this.replaceVariable(html, 'projectName', params.projectName || proposalData.projectName || '프로젝트명')
    html = this.replaceVariable(html, 'companyName', params.companyName || '회사명')
    html = this.replaceVariable(html, 'contactEmail', params.contactEmail || 'contact@example.com')
    html = this.replaceVariable(html, 'createdDate', new Date().toLocaleDateString('ko-KR'))
    html = this.replaceVariable(html, 'author', proposalData.author || '작성자')

    // 제안서 요약
    html = this.replaceVariable(html, 'summary', proposalData.summary || '')

    // 기술 스택 (Technical 템플릿용)
    html = this.replaceVariable(html, 'techStack', proposalData.techStack || 'N/A')
    html = this.replaceVariable(html, 'duration', proposalData.duration || 'N/A')

    // 3. 섹션 데이터 치환 (Handlebars 스타일 반복문 처리)
    if (proposalData.sections && Array.isArray(proposalData.sections)) {
      html = this.replaceSections(html, proposalData.sections)
    }

    // 4. 슬라이드 네비게이션 및 JavaScript 추가 (비즈니스 프레젠테이션 템플릿용)
    if (template.template_type === 'business') {
      html = this.addSlideNavigation(html, proposalData.sections?.length || 0)
    }

    // 5. CSS 스타일 적용
    const css = template.css_styles || ''

    return {
      html,
      css,
      templateInfo: template
    }
  }

  /**
   * 템플릿 변수 치환 헬퍼
   */
  private static replaceVariable(
    html: string,
    key: string,
    value: string
  ): string {
    const regex = new RegExp(`{{${key}}}`, 'g')
    return html.replace(regex, value)
  }

  /**
   * 섹션 반복문 처리 ({{#sections}}...{{/sections}})
   */
  private static replaceSections(html: string, sections: any[]): string {
    // 섹션 반복문 패턴 찾기
    const sectionBlockRegex = /{{#sections}}([\s\S]*?){{\/sections}}/g
    const sectionMatch = sectionBlockRegex.exec(html)

    if (!sectionMatch) {
      // 반복문이 없으면 개별 섹션 placeholder 치환
      sections.forEach((section, index) => {
        html = this.replaceVariable(html, `section_${section.id || index}`, section.content || '')
      })
      return html
    }

    // 반복문 블록 추출
    const blockTemplate = sectionMatch[1]

    // 각 섹션에 대해 블록 렌더링
    const renderedSections = sections
      .map((section, index) => {
        let block = blockTemplate
        block = this.replaceVariable(block, 'id', section.id || `section_${index}`)
        block = this.replaceVariable(block, 'title', section.title || '')
        block = this.replaceVariable(block, 'content', section.content || '')
        block = this.replaceVariable(block, '@index', String(index + 1))
        return block
      })
      .join('\n')

    // 반복문 블록을 렌더링된 섹션들로 교체
    return html.replace(sectionBlockRegex, renderedSections)
  }

  /**
   * 템플릿 미리보기 생성 (샘플 데이터 사용)
   */
  static async generatePreview(templateId: string): Promise<AppliedTemplate> {
    const sampleData = {
      projectName: '샘플 프로젝트',
      summary: '이것은 템플릿 미리보기를 위한 샘플 제안서입니다.',
      author: '홍길동',
      techStack: 'React, TypeScript, Node.js',
      duration: '3개월',
      sections: [
        {
          id: 'overview',
          title: '프로젝트 개요',
          content: '<p>프로젝트의 배경과 목적을 설명합니다.</p>',
          order: 1
        },
        {
          id: 'scope',
          title: '프로젝트 범위',
          content: '<p>프로젝트의 범위와 제한사항을 정의합니다.</p>',
          order: 2
        },
        {
          id: 'timeline',
          title: '일정 계획',
          content: '<p>프로젝트 일정과 마일스톤을 제시합니다.</p>',
          order: 3
        }
      ]
    }

    return this.applyTemplate({
      templateId,
      proposalData: sampleData,
      projectId: 'preview',
      companyName: '(주)샘플컴퍼니',
      contactEmail: 'contact@sample.com'
    })
  }

  /**
   * 템플릿 생성 (관리자 전용)
   */
  static async createTemplate(
    template: Omit<ProposalTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ProposalTemplate> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('proposal_templates')
      .insert({
        name: template.name,
        description: template.description,
        thumbnail_url: template.thumbnail_url,
        html_template: template.html_template,
        css_styles: template.css_styles,
        template_type: template.template_type,
        is_active: template.is_active
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      throw new Error('템플릿 생성 실패')
    }

    return data as ProposalTemplate
  }

  /**
   * 템플릿 수정 (관리자 전용)
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<ProposalTemplate>
  ): Promise<ProposalTemplate> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('proposal_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      throw new Error('템플릿 수정 실패')
    }

    return data as ProposalTemplate
  }

  /**
   * 템플릿 비활성화 (관리자 전용)
   */
  static async deactivateTemplate(templateId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { error} = await supabase
      .from('proposal_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    if (error) {
      console.error('Error deactivating template:', error)
      throw new Error('템플릿 비활성화 실패')
    }
  }

  /**
   * 슬라이드 네비게이션 및 JavaScript 추가 (비즈니스 프레젠테이션 템플릿용)
   */
  private static addSlideNavigation(html: string, sectionCount: number): string {
    // 전체 슬라이드 수: 1 (커버) + sectionCount + 1 (감사)
    const totalSlides = sectionCount + 2

    // 네비게이션 HTML 생성
    const navigationHtml = `
<!-- 슬라이드 네비게이션 -->
<div class="navigation" id="navigation">
  <button class="nav-btn" id="prevBtn">이전</button>
  <div class="slide-indicators" id="indicators">
    ${Array.from({ length: totalSlides }, (_, i) =>
      `<div class="indicator ${i === 0 ? 'active' : ''}" data-slide="${i}"></div>`
    ).join('')}
  </div>
  <button class="nav-btn" id="nextBtn">다음</button>
</div>

<!-- 슬라이드 제어 JavaScript -->
<script>
(function() {
  let currentSlide = 0;
  const slides = document.querySelectorAll('.slide');
  const totalSlides = slides.length;
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const indicators = document.querySelectorAll('.indicator');

  // 슬라이드 표시 함수
  function showSlide(index) {
    // 유효성 검사
    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;

    // 모든 슬라이드 숨기기
    slides.forEach(slide => slide.classList.remove('active'));

    // 현재 슬라이드 표시
    if (slides[index]) {
      slides[index].classList.add('active');
    }

    // 인디케이터 업데이트
    indicators.forEach((indicator, i) => {
      if (i === index) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    });

    // 버튼 활성화/비활성화
    if (prevBtn) prevBtn.disabled = (index === 0);
    if (nextBtn) nextBtn.disabled = (index === totalSlides - 1);

    currentSlide = index;
  }

  // 이전 슬라이드
  function prevSlide() {
    showSlide(currentSlide - 1);
  }

  // 다음 슬라이드
  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  // 특정 슬라이드로 이동
  function goToSlide(index) {
    showSlide(index);
  }

  // 이벤트 리스너 등록
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => goToSlide(index));
  });

  // 키보드 네비게이션
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'Home') showSlide(0);
    if (e.key === 'End') showSlide(totalSlides - 1);
  });

  // 초기 슬라이드 표시
  showSlide(0);
})();
</script>
`

    // HTML 끝에 네비게이션 추가 (</div> 태그 이전 또는 body 끝)
    // 마지막 슬라이드 이후에 추가
    const lastSlideIndex = html.lastIndexOf('</div>')
    if (lastSlideIndex !== -1) {
      html = html.slice(0, lastSlideIndex + 6) + navigationHtml + html.slice(lastSlideIndex + 6)
    } else {
      // fallback: 끝에 추가
      html += navigationHtml
    }

    return html
  }
}
