(() => {
  const companies = {
    starlive: {
      label: 'STAR LIVE ONLINE',
      logo: '/assets/starlive-logo.png',
    },
    imdp: {
      label: "I'M DP",
      logo: '/assets/iamdp-logo.png',
    },
  };

  const fieldMapping = [
    ['applicationDate', 'Page 1: application date and signature date'],
    ['expectedSalary', 'Page 1: requested salary'],
    ['titleTh, firstNameTh, lastNameTh', 'Page 1: Thai full name'],
    ['fullNameEn', 'Page 1: English full name'],
    ['nickname', 'Page 1: Thai and English nickname'],
    ['sex', 'Page 1: sex checkbox'],
    ['birthDate, age', 'Page 1: date of birth and age'],
    ['nationality, race, religion', 'Page 1: personal details'],
    ['height, weight, phone, email', 'Page 1: physical/contact details'],
    ['lineId, facebookId, instagram, tiktok', 'Page 1: social contacts'],
    ['address, idCardNo, idIssueDate, idExpiryDate', 'Page 1: address and ID card'],
    ['livingStatus, maritalStatus', 'Page 1: living and marital status'],
    ['spouseName, spouseOccupation, childrenCount', 'Page 1: spouse and children'],
    ['child1..3Name/Age/Occupation', 'Page 1: child age lines and detail notes'],
    ['father*/mother*', 'Page 1: parents, status, age and occupation'],
    ['siblingsCount, birthOrder, militaryStatus', 'Page 1: siblings and military status'],
    ['education1..4*', 'Page 1: four education rows'],
    ['employment1..3*', 'Page 2: three employment rows'],
    ['references', 'Page 2: two reference rows or legacy free text'],
    ['thai*Speaking/Listening/Reading/Writing', 'Page 2: Thai language checkboxes'],
    ['english*Speaking/Listening/Reading/Writing', 'Page 2: English language checkboxes'],
    ['otherLanguages, languageCertificates', 'Page 2: other languages and certificates'],
    ['computerSkills, specialAbility, officeEquipment', 'Page 2: computer and special skills'],
    ['canDrive, licenseNo', 'Page 2: driving and license'],
    ['workOtherProvince, canGuarantor, canShift', 'Page 3: work condition checkboxes'],
    ['relativesAtCompany, relationship, recruitmentSource', 'Page 3: additional details'],
    ['availableStartDate, previouslyApplied, previousAppliedWhen', 'Page 3: availability/application history'],
    ['selfIntroduction, declaration', 'Page 3: self-introduction and declaration'],
    ['photoPath + application_documents.profile_photo', 'Page 1: private candidate photo'],
  ];

  const normalize = (value) =>
    String(value ?? '')
      .toLocaleLowerCase()
      .replace(/[\s/():：.\-]/g, '');

  const textValue = (value) =>
    value === undefined || value === null ? '' : String(value).trim();

  const formatDate = (value) => {
    const match = textValue(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${Number(match[1]) + 543}` : textValue(value);
  };

  const findSpan = (root, label, occurrence = 0) => {
    const wanted = normalize(label);
    return [...root.querySelectorAll('span')]
      .filter((span) => normalize(span.textContent).startsWith(wanted))[occurrence];
  };

  const inputAfterLabel = (root, label, occurrence = 0) => {
    const span = findSpan(root, label, occurrence);
    if (!span?.parentElement) return null;
    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    return (
      [...span.parentElement.querySelectorAll('input.input-line')]
        .find((input) => span.compareDocumentPosition(input) & following) || null
    );
  };

  const inputAfterExactLabel = (root, label, occurrence = 0) => {
    const wanted = normalize(label);
    const span = [...root.querySelectorAll('span')]
      .filter((item) => normalize(item.textContent) === wanted)[occurrence];
    if (!span?.parentElement) return null;
    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    return [...span.parentElement.querySelectorAll('input.input-line')]
      .find((input) => span.compareDocumentPosition(input) & following) || null;
  };

  const inputAfterTextPrefix = (root, prefix, occurrence = 0) => {
    const wanted = normalize(prefix);
    return (
      [...root.querySelectorAll('input.input-line')]
        .filter((input) => normalize(input.parentElement?.textContent).startsWith(wanted))[occurrence] ||
      null
    );
  };

  const setInput = (input, value, wrap = false) => {
    const valueText = textValue(value);
    if (!input || !valueText) return false;
    if (!wrap) {
      input.value = valueText;
      input.setAttribute('value', valueText);
      return true;
    }
    const field = document.createElement('div');
    field.className = `${input.className} mapped-wrap`;
    field.textContent = valueText;
    input.replaceWith(field);
    return true;
  };

  const getTable = (headerText) => {
    const wanted = normalize(headerText);
    return [...document.querySelectorAll('#page-1 table, #page-2 table')]
      .find((table) => normalize(table.tHead?.textContent || table.textContent).includes(wanted)) || null;
  };

  const setCheckbox = (root, label, checked, occurrence = 0) => {
    const wanted = normalize(label);
    const matches = [...root.querySelectorAll('label')]
      .filter((item) => normalize(item.textContent).includes(wanted));
    const checkbox = matches[occurrence]?.querySelector('input[type="checkbox"]');
    if (!checkbox) return false;
    checkbox.checked = Boolean(checked);
    return true;
  };

  const setQuestionChoice = (root, question, selected, choices) => {
    const labelSpan = findSpan(root, question);
    if (!labelSpan) return false;
    let container = labelSpan.parentElement;
    while (container && container !== root) {
      const labels = [...container.querySelectorAll('label')]
        .filter((item) => item.querySelector('input[type="checkbox"]'));
      if (labels.length >= choices.length) {
        labels.forEach((item) => {
          const checkbox = item.querySelector('input[type="checkbox"]');
          const normalizedOption = normalize(item.textContent);
          const match = choices.find((choice) =>
            normalizedOption.startsWith(normalize(choice.label)),
          );
          checkbox.checked = Boolean(selected && match && (match.value ?? match.label) === selected);
        });
        return true;
      }
      container = container.parentElement;
    }
    return false;
  };

  const findColumnInput = (row, column) =>
    row?.querySelectorAll(':scope > td')[column]?.querySelector('input.input-line') || null;

  const populateEducation = (data) => {
    const table = getTable('Year Attended');
    const rows = [...(table?.querySelectorAll('tbody tr') || [])];
    const englishLevels = {
      'ต่ำกว่ามัธยมศึกษาตอนปลาย': 'Below upper secondary',
      'มัธยมศึกษาตอนปลาย (ม.6) / กศน.': 'Upper secondary',
      'ปวช. (ประกาศนียบัตรวิชาชีพ)': 'Vocational Certificate',
      'ปวส. (ประกาศนียบัตรวิชาชีพชั้นสูง) / อนุปริญญา': 'Higher Vocational / Diploma',
      'ปริญญาตรี': "Bachelor's Degree",
      'ปริญญาโท': "Master's Degree",
      'ปริญญาเอก': 'Doctoral Degree',
      'สูงกว่าปริญญาเอก': 'Postdoctoral',
    };

    for (let index = 0; index < Math.min(rows.length, 4); index += 1) {
      const number = index + 1;
      const level = textValue(data[`education${number}Level`]);
      const cells = rows[index].querySelectorAll(':scope > td');
      if (level && cells[0]) {
        const mainLabel = [...cells[0].childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
        if (mainLabel) mainLabel.textContent = level;
        const translation = cells[0].querySelector('span');
        if (translation) translation.textContent = englishLevels[level] || '';
      }

      const values = [
        data[`education${number}Institute`],
        data[`education${number}CountryOther`] || data[`education${number}Country`],
        [data[`education${number}From`], data[`education${number}To`]].filter(Boolean).join(' - '),
        data[`education${number}Course`],
        data[`education${number}Gpa`],
      ];
      const wrapCells = [0, 1, 3];
      values.forEach((value, cellIndex) => setInput(findColumnInput(rows[index], cellIndex + 1), value, wrapCells.includes(cellIndex)));
    }
  };

  const populateEmployment = (data) => {
    const table = getTable('Firm Name');
    const body = table?.querySelector('tbody');
    if (!body) return;
    while (body.querySelectorAll('tr').length < 3) {
      const templateRow = body.querySelector('tr:last-child');
      if (!templateRow) break;
      const newRow = templateRow.cloneNode(true);
      newRow.querySelectorAll('input').forEach((input) => {
        input.value = '';
        input.removeAttribute('value');
      });
      body.appendChild(newRow);
    }

    const rows = [...body.querySelectorAll('tr')].slice(0, 3);
    rows.forEach((row, index) => {
      const number = index + 1;
      const values = [
        data[`employment${number}Company`],
        [formatDate(data[`employment${number}From`]), formatDate(data[`employment${number}To`])]
          .filter(Boolean).join(' - '),
        data[`employment${number}Position`],
        data[`employment${number}Description`],
        data[`employment${number}LastSalary`],
        data[`employment${number}Reason`],
      ];
      [...row.querySelectorAll(':scope > td')].forEach((cell, column) => {
        setInput(cell.querySelector('input.input-line'), values[column], [0, 1, 2, 3, 5].includes(column));
      });
    });
  };

  const populateReferences = (data) => {
    const table = getTable('Firm Address');
    const rows = [...(table?.querySelectorAll('tbody tr') || [])].slice(0, 2);
    const references = data.references;
    if (Array.isArray(references)) {
      rows.forEach((row, index) => {
        const ref = references[index];
        if (!ref || typeof ref !== 'object') return;
        const values = [
          ref.name || ref.full_name || ref.fullName,
          ref.address || ref.company || ref.firm_address,
          ref.position,
          ref.phone || ref.telephone,
        ];
        [...row.querySelectorAll(':scope > td')].forEach((cell, column) =>
          setInput(cell.querySelector('input.input-line'), values[column], true),
        );
      });
    } else {
      setInput(rows[0]?.querySelector('td input.input-line'), references, true);
    }
  };

  const populateLanguageRatings = (root, language, keys) => {
    const wanted = normalize(language);
    const row = [...root.querySelectorAll('tbody tr')]
      .find((candidate) => normalize(candidate.querySelector('td')?.textContent).includes(wanted));
    if (!row) return;
    const cells = [...row.querySelectorAll(':scope > td')].slice(1);
    keys.forEach((key, index) => {
      const value = normalize(dataValue(key));
      const rating = ['ดีมาก', 'excellent', 'verygood'].map(normalize).includes(value)
        ? 0
        : ['ดี', 'good'].map(normalize).includes(value)
          ? 1
          : ['พอใช้', 'พื้นฐาน', 'fair', 'basic'].map(normalize).includes(value)
            ? 2
            : -1;
      if (rating >= 0 && cells[index * 3 + rating]) {
        const checkbox = cells[index * 3 + rating].querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = true;
      }
    });
  };

  const dataValue = (key) => activeData?.[key];
  let activeData = {};

  const applyPayload = (payload) => {
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : {};
    activeData = data;
    const page1 = document.getElementById('page-1');
    const page2 = document.getElementById('page-2');
    const page3 = document.getElementById('page-3');
    if (!page1 || !page2 || !page3) return;

    const thaiName = [
      data.titleTh === 'อื่นๆ (โปรดระบุ)' ? data.titleThOther : data.titleTh,
      data.firstNameTh,
      data.lastNameTh,
    ].filter(Boolean).join(' ');

    const personalFields = [
      ['applicationDate', page1, 'วันที่สมัคร', formatDate(data.applicationDate)],
      ['position', page1, 'ตำแหน่งที่ต้องการ', payload.job],
      ['expectedSalary', page1, 'เงินเดือนที่ต้องการ', data.expectedSalary],
      ['thaiName', page1, 'ชื่อ-สกุลภาษาไทย', thaiName],
      ['nickname', page1, 'ชื่อเล่น', data.nickname],
      ['fullNameEn', page1, 'Name in English', data.fullNameEn],
      ['nicknameEn', page1, 'Nickname', data.nickname],
      ['birthDate', page1, 'วัน เดือน ปี เกิด', formatDate(data.birthDate)],
      ['age', page1, 'อายุ (Age)', data.age],
      ['nationality', page1, 'สัญชาติ', data.nationalityOther || data.nationality],
      ['race', page1, 'เชื้อชาติ', data.raceOther || data.race],
      ['religion', page1, 'ศาสนา', data.religionOther || data.religion],
      ['height', page1, 'ส่วนสูง', data.height],
      ['weight', page1, 'น้ำหนัก', data.weight],
      ['phone', page1, 'โทรศัพท์', data.phone],
      ['lineId', page1, 'Line ID', data.lineId],
      ['facebookId', page1, 'Facebook', data.facebookId],
      ['instagram', page1, 'Instagram', data.instagram],
      ['tiktok', page1, 'Tiktok', data.tiktok],
      ['email', page1, 'E-mail', data.email],
      ['address', page1, 'ที่อยู่ปัจจุบันที่ติดต่อได้สะดวก', data.address],
      ['idCardNo', page1, 'บัตรประชาชนเลขที่', data.idCardNo],
      ['idIssueDate', page1, 'วันออกบัตร', formatDate(data.idIssueDate)],
      ['idExpiryDate', page1, 'บัตรหมดอายุ', formatDate(data.idExpiryDate)],
      ['spouseName', page1, 'ชื่อคู่สมรส', data.spouseName],
      ['spouseOccupation', page1, 'อาชีพ', data.spouseOccupation, 0],
      ['childrenCount', page1, 'จำนวนบุตร', data.childrenCount],
      ['fatherName', page1, 'ชื่อบิดา', data.fatherName],
      ['fatherAge', page1, 'อายุ', data.fatherAge, 0],
      ['fatherOccupation', page1, 'อาชีพ', data.fatherOccupation, 1],
      ['motherName', page1, 'ชื่อมารดา', data.motherName],
      ['motherAge', page1, 'อายุ', data.motherAge, 1],
      ['motherOccupation', page1, 'อาชีพ', data.motherOccupation, 2],
    ];

    const wrapPersonal = new Set([
      'address', 'position', 'email', 'facebookId', 'instagram', 'lineId', 'tiktok',
      'militaryStatus', 'thaiName', 'fullNameEn', 'nickname', 'nicknameEn',
      'spouseName', 'fatherName', 'motherName', 'idCardNo',
    ]);
    let mapped = 0;
    personalFields.forEach(([key, root, label, value, occurrence = 0]) => {
      const target = key === 'age'
        ? inputAfterExactLabel(root, label)
        : key === 'fatherAge' || key === 'motherAge'
          ? inputAfterExactLabel(root, label, occurrence)
          : inputAfterLabel(root, label, occurrence);
      if (target) {
        mapped += 1;
        setInput(target, value, wrapPersonal.has(key));
      }
    });

    [
      ['siblingsCount', 'จำนวนพี่น้อง', data.siblingsCount],
      ['birthOrder', 'ท่านเป็นคนที่', data.birthOrder],
      ['militaryStatus', 'สถานะทางทหาร', data.militaryStatus],
    ].forEach(([key, label, value]) => {
      const target = inputAfterTextPrefix(page1, label);
      if (target) {
        mapped += 1;
        setInput(target, value, key === 'militaryStatus');
      }
    });

    for (let index = 1; index <= 3; index += 1) {
      const target = inputAfterTextPrefix(page1, `อายุบุตรคนที่ ${index}`);
      if (target) setInput(target, data[`child${index}Age`]);
      const details = [
        data[`child${index}Name`] ? `ชื่อ ${data[`child${index}Name`]}` : '',
        data[`child${index}Occupation`] ? `อาชีพ ${data[`child${index}Occupation`]}` : '',
      ].filter(Boolean).join(' · ');
      if (details && target?.parentElement) {
        const note = document.createElement('small');
        note.className = 'mapped-child-detail';
        note.textContent = details;
        target.parentElement.appendChild(note);
      }
    }

    const parentStatusLabels = ['มีชีวิต', 'ถึงแก่กรรม'];
    const parentStatusOptions = [...page1.querySelectorAll('label')]
      .filter((label) => parentStatusLabels.some((option) =>
        normalize(label.textContent).includes(normalize(option)),
      ));
    [['fatherStatus', data.fatherStatus, 0], ['motherStatus', data.motherStatus, 1]]
      .forEach(([, value, parentIndex]) => {
        parentStatusLabels.forEach((label, optionIndex) => {
          const selected = normalize(value) === normalize(label) ||
            (normalize(value) === normalize('เสียชีวิต') && label === 'ถึงแก่กรรม');
          const checkbox = parentStatusOptions[Number(parentIndex) * 2 + optionIndex]
            ?.querySelector('input[type="checkbox"]');
          if (checkbox) checkbox.checked = Boolean(selected);
        });
        if (value) mapped += 1;
      });

    const livingOptions = [
      { label: 'บ้านส่วนตัว', values: ['บ้านส่วนตัว (ของตนเอง/ครอบครัว)', 'บ้านส่วนตัว'] },
      { label: 'บ้านเช่า', values: ['บ้านเช่า'] },
      { label: 'อาศัยบิดามารดา', values: ['อาศัยบิดามารดา', 'อาศัยอยู่กับบิดามารดา'] },
      { label: 'อาศัยอยู่กับผู้อื่น', values: ['อาศัยอยู่กับผู้อื่น (ญาติ/เพื่อน)'] },
    ];
    const livingValue = data.livingStatusOther || data.livingStatus;
    const livingMatch = livingOptions.find((option) =>
      option.values.some((value) => normalize(value) === normalize(livingValue)),
    );
    if (livingMatch) setQuestionChoice(page1, 'สถานะความเป็นอยู่', livingMatch.label, livingOptions);
    else if (livingValue) {
      const livingSpan = findSpan(page1, 'สถานะความเป็นอยู่');
      const group = livingSpan?.parentElement;
      const note = document.createElement('span');
      note.className = 'mapped-inline-detail';
      note.textContent = livingValue;
      group?.appendChild(note);
    }

    const maritalValue = data.maritalStatus;
    const maritalChoice = {
      'โสด': 'โสด',
      'สมรส': 'แต่งงาน',
      'แต่งงาน': 'แต่งงาน',
      'หย่าร้าง': 'หย่า',
      'หย่า': 'หย่า',
      'หม้าย': 'หม้าย',
      'แยกกันอยู่': 'แยกกันอยู่',
    }[maritalValue];
    if (maritalChoice) setCheckbox(page1, maritalChoice, true);

    const sexValue = normalize(data.sex);
    const sex = sexValue === normalize('ชาย') ? 'ชาย (Male)'
      : sexValue === normalize('หญิง') ? 'หญิง (Female)'
        : sexValue === normalize('ไม่ระบุ') ? 'ไม่ระบุ' : '';
    ['ชาย (Male)', 'หญิง (Female)', 'ไม่ระบุ'].forEach((option) =>
      setCheckbox(page1, option, option === sex),
    );

    const applicantOccupation = textValue(data.occupation);
    const familyNotes = textValue(data.familyNotes);
    if (applicantOccupation || familyNotes) {
      const block = document.createElement('div');
      block.className = 'mapped-family-note';
      block.textContent = [
        applicantOccupation ? `อาชีพปัจจุบัน: ${applicantOccupation}` : '',
        familyNotes ? `ข้อมูลครอบครัวเพิ่มเติม: ${familyNotes}` : '',
      ].filter(Boolean).join(' | ');
      document.querySelector('#page-1 .mt-3')?.before(block);
    }

    populateEducation(data);
    populateEmployment(data);
    populateReferences(data);

    const languagesTable = [...document.querySelectorAll('#page-2 table')]
      .find((table) => normalize(table.textContent).includes(normalize('Type of Language')));
    if (languagesTable) {
      populateLanguageRatings(languagesTable, 'Thai', [
        'thaiSpeaking', 'thaiListening', 'thaiReading', 'thaiWriting',
      ]);
      populateLanguageRatings(languagesTable, 'English', [
        'englishSpeaking', 'englishListening', 'englishReading', 'englishWriting',
      ]);
      if (data.otherLanguages) {
        const otherRow = [...languagesTable.querySelectorAll('tbody tr')]
          .find((row) => normalize(row.querySelector('td')?.textContent).includes(normalize('Other')));
        const cell = otherRow?.querySelector('td');
        if (cell) {
          cell.colSpan = 13;
          cell.textContent = textValue(data.otherLanguages);
          [...otherRow.children].slice(1).forEach((item) => item.remove());
        }
      }
    }

    const certificateInput = inputAfterLabel(page2, 'ใบรับรองด้านภาษา');
    if (certificateInput) setInput(certificateInput, data.languageCertificates, true);

    const computerInput = inputAfterLabel(page2, 'ระบุ');
    if (computerInput) setInput(computerInput, data.computerSkills, true);
    if (data.computerSkills) {
      const computerSelected = /^(ไม่ได้|no)$/i.test(textValue(data.computerSkills)) ? 'ไม่ได้' : 'ได้';
      setQuestionChoice(page2, 'ท่านสามารถใช้คอมพิวเตอร์ได้หรือไม่', computerSelected, [
        { label: 'ไม่ได้', value: 'ไม่ได้' },
        { label: 'ได้', value: 'ได้' },
      ]);
    }

    const specialSkillSpan = findSpan(page2, 'ความรู้พิเศษและความสามารถพิเศษ');
    const specialBlock = specialSkillSpan?.parentElement?.parentElement;
    if (data.specialAbility && specialBlock) {
      const target = [...specialBlock.querySelectorAll('div')]
        .find((item) => normalize(item.textContent).startsWith(normalize('ความรู้พิเศษ')));
      const note = document.createElement('div');
      note.className = 'mapped-skill-note';
      note.textContent = `ความรู้พิเศษ / Special Ability: ${textValue(data.specialAbility)}`;
      target?.appendChild(note);
    }
    const equipmentInput = inputAfterLabel(page2, 'ความสามารถในการใช้เครื่องมือสำนักงาน');
    setInput(equipmentInput, data.officeEquipment, true);

    const driving = textValue(data.canDrive);
    if (driving) {
      const yes = !/ขับไม่ได้|^ไม่ได้$|^no$/i.test(driving);
      setQuestionChoice(page2, 'ท่านสามารถขับรถยนต์ได้หรือไม่', yes ? 'ได้' : 'ไม่ได้', [
        { label: 'ไม่ได้', value: 'ไม่ได้' },
        { label: 'ได้', value: 'ได้' },
      ]);
    }
    const licenseInput = inputAfterLabel(page2, "ใบขับขี่เลขที่");
    setInput(licenseInput, data.licenseNo);

    const conditions = [
      ['workOtherProvince', 'ท่านสามารถไปปฏิบัติงานต่างจังหวัดได้ไหม', data.workOtherProvince],
      ['canGuarantor', 'ในตำแหน่งงานที่ต้องมีการค้ำประกัน', data.canGuarantor],
      ['canShift', 'ในการปฏิบัติงานเป็นกะหมุนเวียน', data.canShift],
      ['previouslyApplied', 'ท่านเคยสมัครงานกับบริษัทนี้มาก่อนหรือไม่', data.previouslyApplied],
    ];
    conditions.forEach(([key, question, value]) => {
      if (!value) return;
      const normalizedValue = normalize(value);
      const affirmative = key === 'canGuarantor' || key === 'canShift'
        ? !['ขัดข้อง', 'ไม่ได้', 'no'].map(normalize).includes(normalizedValue)
        : !['ไม่ได้', 'ไม่เคย', 'no'].map(normalize).includes(normalizedValue);
      const yesText = key === 'canGuarantor' || key === 'canShift' ? 'ไม่ขัดข้อง' : 'ได้';
      const noText = key === 'previouslyApplied' ? 'ไม่เคย' : key === 'canGuarantor' || key === 'canShift' ? 'ขัดข้อง' : 'ไม่ได้';
      setQuestionChoice(page3, question, affirmative ? yesText : noText, [
        { label: noText, value: noText },
        { label: yesText, value: yesText },
      ]);
    });

    [
      ['relativesAtCompany', 'บุคคลในบริษัทฯ ที่รู้จัก', data.relativesAtCompany],
      ['relationship', 'ความสัมพันธ์', data.relationship],
      ['recruitmentSource', 'ทราบข่าวการรับสมัครจาก', data.recruitmentSourceOther || data.recruitmentSource],
      ['availableStartDate', 'พร้อมปฏิบัติงานวันที่', formatDate(data.availableStartDate)],
      ['previousAppliedWhen', 'ถ้าเคยเมื่อไร', data.previousAppliedWhen],
      ['signatureDate', 'วันที่ (Date)', formatDate(data.applicationDate)],
    ].forEach(([key, label, value]) => {
      const target = inputAfterLabel(page3, label);
      if (target) {
        mapped += 1;
        setInput(target, value, key === 'recruitmentSource');
      }
    });

    const intro = textValue(data.selfIntroduction);
    const introLabel = [...page3.querySelectorAll('span')]
      .find((span) => normalize(span.textContent).startsWith(normalize('กรุณาแนะนำตัวท่านเอง')));
    const introBox = introLabel?.nextElementSibling;
    if (intro && introBox) {
      introBox.textContent = intro;
      introBox.classList.add('mapped-introduction');
    }

    const declaration = textValue(data.declaration);
    if (declaration) {
      const declarationParagraphs = [...page3.querySelectorAll('p')];
      const lastDeclaration = declarationParagraphs[declarationParagraphs.length - 1];
      if (lastDeclaration) {
        const note = document.createElement('p');
        note.className = 'mapped-declaration';
        note.textContent = declaration;
        lastDeclaration.after(note);
      }
    }

    const signature = textValue(data.signature);
    if (/^data:image\//i.test(signature)) {
      const signatureImage = document.getElementById('signature-image');
      if (signatureImage) {
        signatureImage.src = signature;
        signatureImage.style.display = 'block';
        mapped += 1;
      }
    }

    const photoBox = document.getElementById('candidate-photo-box') || page1.querySelector('.w-20.h-24');
    if (payload.photoUrl && photoBox && /^https?:\/\//i.test(payload.photoUrl)) {
      const image = document.createElement('img');
      image.src = payload.photoUrl;
      image.alt = 'Candidate photo';
      image.className = 'candidate-photo';
      photoBox.replaceChildren(image);
    }

    document.documentElement.dataset.mappedFields = String(mapped);
    document.documentElement.dataset.mappingTable = 'application-v2';
  };

  const renderCompanyLogos = () => {
    const starButton = document.getElementById('btn-starlive');
    const imdpButton = document.getElementById('btn-imdp');
    const buttons = { starlive: starButton, imdp: imdpButton };

    Object.entries(buttons).forEach(([key, button]) => {
      if (!button) return;
      button.className = 'company-logo-button';
      button.type = 'button';
      button.setAttribute('aria-label', `เลือกบริษัท ${companies[key].label}`);
      button.title = companies[key].label;
      button.setAttribute('aria-pressed', 'false');
      button.replaceChildren();
      const image = document.createElement('img');
      image.src = companies[key].logo;
      image.alt = '';
      image.draggable = false;
      button.appendChild(image);
    });

    const logoTargets = ['brand-logo-text', 'brand-logo-text-2', 'brand-logo-text-3']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    logoTargets.forEach((target) => {
      target.classList.add('company-header-logo');
      target.replaceChildren();
      const image = document.createElement('img');
      image.alt = '';
      image.className = 'company-header-image';
      target.appendChild(image);
    });

    window.setBrand = (brand) => {
      const selected = brand === 'imdp' ? 'imdp' : 'starlive';
      Object.entries(buttons).forEach(([key, button]) => {
        if (!button) return;
        const active = key === selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      logoTargets.forEach((target) => {
        const image = target.querySelector('img');
        if (image) {
          image.src = companies[selected].logo;
          image.alt = companies[selected].label;
        }
      });
      document.title = `${companies[selected].label} — ใบสมัครงาน`;
    };
    window.setBrand('starlive');
  };

  const addRuntimeStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      .company-logo-button{display:inline-flex;align-items:center;justify-content:center;min-width:126px;height:44px;padding:5px 12px;border:1px solid #64748b;border-radius:7px;background:#fff;opacity:.78;cursor:pointer;transition:background-color .15s,border-color .15s,opacity .15s,box-shadow .15s}
      .company-logo-button img{display:block;max-width:110px;max-height:31px;width:auto;height:auto;object-fit:contain}
      .company-logo-button:hover{opacity:1}
      .company-logo-button.active{background:#fff7e6;border:2px solid #f59e0b;opacity:1;box-shadow:0 0 0 2px #f59e0b33}
      .company-header-logo{display:inline-flex;align-items:center;min-height:24px}
      .company-header-image{display:block;max-width:118px;max-height:28px;width:auto;height:auto;object-fit:contain;object-position:left center}
      .mapped-wrap{display:block;white-space:pre-wrap;overflow-wrap:anywhere;min-height:1.4em;height:auto!important;padding:0 2px}
      .mapped-child-detail{display:block;max-width:100%;white-space:normal;overflow-wrap:anywhere;font-size:8px;line-height:1.15}
      .mapped-inline-detail,.mapped-family-note,.mapped-skill-note{font-size:9pt;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}
      .mapped-family-note{margin:1mm 0 0;font-size:8.5pt}
      .mapped-skill-note{margin-top:1mm}
      .mapped-introduction{height:auto!important;min-height:20mm;white-space:pre-wrap;overflow-wrap:anywhere;font-size:9pt}
      .mapped-declaration{white-space:pre-wrap;overflow-wrap:anywhere;font-size:9pt}
      .candidate-photo{display:block;width:100%;height:100%;max-height:30mm;object-fit:contain}
      .hidden{display:none!important}
      @media screen and (max-width:760px){
        body{overflow-x:hidden}
        .toolbar{position:relative!important;padding:10px!important}
        .toolbar>div{max-width:100%;flex-wrap:wrap}
        .company-logo-button{min-width:100px;height:40px}
        .company-logo-button img{max-width:84px;max-height:26px}
        .a4-page{width:calc(100vw - 16px)!important;min-height:0!important;height:auto!important;margin:8px!important;padding:12px!important;overflow:visible!important}
        .a4-page table{width:100%;table-layout:fixed}
        .a4-page input.input-line{min-width:0;max-width:100%}
        #tab-nav-container>div{overflow-x:auto}
        #tab-nav-container button{white-space:nowrap}
      }
      @media print{
        @page{size:A4 portrait;margin:0}
        body{background:#fff!important}
        .no-print{display:none!important}
        main.py-4{padding:0!important}
        .a4-page{box-sizing:border-box!important;width:210mm!important;height:297mm!important;min-height:297mm!important;margin:0!important;padding:8mm 10mm!important;overflow:hidden!important;page-break-after:always;break-after:page}
        .a4-page:last-child{page-break-after:auto;break-after:auto}
        .a4-page tr,.a4-page td{break-inside:avoid}
        .a4-page input{color:#111!important}
        .mapped-wrap,.mapped-child-detail,.mapped-family-note,.mapped-skill-note,.mapped-introduction,.mapped-declaration{-webkit-print-color-adjust:exact;print-color-adjust:exact}
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      }
    `;
    document.head.appendChild(style);
  };

  const start = () => {
    addRuntimeStyles();
    renderCompanyLogos();
    let payload = {};
    try {
      payload = JSON.parse(window.name || '{}');
    } catch {
      payload = {};
    }
    applyPayload(payload);
    window.__applicationTemplateFieldMapping = fieldMapping;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
