feather.replace();

    document.querySelectorAll('.radio-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input[type="radio"]').checked = true;
        });
    });

    document.getElementById('ride-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const fields = [
            { id: 'name',    errorId: 'name-error',    check: v => v.trim() !== '' },
            { id: 'phone',   errorId: 'phone-error',   check: v => v.trim() !== '' },
            { id: 'email',   errorId: 'email-error',   check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
            { id: 'address', errorId: 'address-error', check: v => v.trim() !== '' },
            { id: 'date',    errorId: 'date-error',    check: v => v !== '' },
            { id: 'time',    errorId: 'time-error',    check: v => v !== '' },
        ];
        let isValid = true;
        fields.forEach(f => {
            document.getElementById(f.id).classList.remove('error');
            document.getElementById(f.errorId).style.display = 'none';
        });
        document.getElementById('weekly-error').style.display = 'none';
        fields.forEach(f => {
            const input = document.getElementById(f.id);
            if (!f.check(input.value)) {
                input.classList.add('error');
                document.getElementById(f.errorId).style.display = 'block';
                isValid = false;
            }
        });
        if (!document.querySelector('input[name="weekly"]:checked')) {
            document.getElementById('weekly-error').style.display = 'block';
            isValid = false;
        }
        if (isValid) {
            document.getElementById('ride-form').style.display = 'none';
            document.getElementById('success-msg').style.display = 'block';
            feather.replace();
        }
    });